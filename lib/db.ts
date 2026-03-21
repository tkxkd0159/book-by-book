import postgres from "postgres";

import { env } from "@/lib/env";

const connectionString = env.database.url;
const sql = postgres(connectionString);

export default sql;
