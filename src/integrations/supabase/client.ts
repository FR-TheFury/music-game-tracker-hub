// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nhezquxskhvlunqceyuc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oZXpxdXhza2h2bHVucWNleXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNTc4MzYsImV4cCI6MjA2NTgzMzgzNn0.ZG27wjX65Yui5wnxZb6eDi8H80ZqQ3Y4fweTnJrktCM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);