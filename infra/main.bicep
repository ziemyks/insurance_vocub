// Azure resources for the Insurance Business Vocabulary (plan §3).
// Deploy: az deployment group create -g <rg> -f infra/main.bicep -p infra/main.parameters.json
// Production hardening still to add per environment: private endpoints / VNet integration for
// Postgres and Key Vault, and a staging deployment slot.

@description('Short prefix for resource names, e.g. vocab-dev')
param namePrefix string

param location string = resourceGroup().location

@description('Entra ID tenant used for sign-in')
param tenantId string = subscription().tenantId

@description('Application (client) ID of the Entra ID app registration')
param entraClientId string

@secure()
param entraClientSecret string

@secure()
@description('Auth.js session secret (npx auth secret)')
param authSecret string

param postgresAdminLogin string = 'vocabadmin'

@secure()
param postgresAdminPassword string

@description('JSON mapping of Entra group object IDs to roles, see .env.example')
param roleGroupMap string = '{}'

param appServiceSku string = 'P0v3'

var suffix = uniqueString(resourceGroup().id, namePrefix)
var webName = '${namePrefix}-web-${suffix}'
var dbServerName = '${namePrefix}-pg-${suffix}'
var vaultName = take(replace('${namePrefix}kv${suffix}', '-', ''), 24)

resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: dbServerName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '17'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32, autoGrow: 'Enabled' }
    backup: { backupRetentionDays: 35, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

// pg_trgm powers fuzzy, diacritics-insensitive search; Azure requires allow-listing it.
resource pgExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: pg
  name: 'azure.extensions'
  properties: { value: 'PG_TRGM', source: 'user-override' }
}

resource pgDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: pg
  name: 'vocab'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

resource pgAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}

resource secretDb 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'database-url'
  properties: {
    value: 'postgresql://${postgresAdminLogin}:${uriComponent(postgresAdminPassword)}@${pg.properties.fullyQualifiedDomainName}:5432/vocab?sslmode=require'
  }
}

resource secretAuth 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'auth-secret'
  properties: { value: authSecret }
}

resource secretEntra 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'entra-client-secret'
  properties: { value: entraClientSecret }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${namePrefix}-plan'
  location: location
  kind: 'linux'
  sku: { name: appServiceSku }
  properties: { reserved: true }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: webName
  location: location
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node apps/web/server.js' // build with BUILD_STANDALONE=true
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: '/signin'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'DATABASE_URL', value: '@Microsoft.KeyVault(SecretUri=${secretDb.properties.secretUri})' }
        { name: 'AUTH_SECRET', value: '@Microsoft.KeyVault(SecretUri=${secretAuth.properties.secretUri})' }
        { name: 'AUTH_URL', value: 'https://${webName}.azurewebsites.net' }
        { name: 'AUTH_MICROSOFT_ENTRA_ID_ID', value: entraClientId }
        { name: 'AUTH_MICROSOFT_ENTRA_ID_SECRET', value: '@Microsoft.KeyVault(SecretUri=${secretEntra.properties.secretUri})' }
        { name: 'AUTH_MICROSOFT_ENTRA_ID_ISSUER', value: '${environment().authentication.loginEndpoint}${tenantId}/v2.0' }
        { name: 'ROLE_GROUP_MAP', value: roleGroupMap }
        { name: 'DEFAULT_ROLE', value: 'VIEWER' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
      ]
    }
  }
}

// Key Vault Secrets User for the web app's managed identity
resource vaultAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, web.id, 'kv-secrets-user')
  scope: vault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: web.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output webUrl string = 'https://${web.properties.defaultHostName}'
output entraRedirectUri string = 'https://${web.properties.defaultHostName}/api/auth/callback/microsoft-entra-id'
output postgresHost string = pg.properties.fullyQualifiedDomainName
