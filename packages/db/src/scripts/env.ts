import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Scripts read the repository-root .env, wherever they are started from.
config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });
