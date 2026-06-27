import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qhfyjckarxxouyitzbtv.supabase.co'
const supabaseKey = 'sb_publishable_YMkbNMWuLWK6e5H5yI9qEg_aNz6J81e'

export const supabase = createClient(supabaseUrl, supabaseKey)
