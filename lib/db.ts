import postgres from "postgres";

import { getDatabaseEnv } from "@/lib/env";

const connectionString = getDatabaseEnv().databaseUrl;
const sql = postgres(connectionString);

export default sql;
