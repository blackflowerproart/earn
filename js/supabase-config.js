// إعدادات الاتصال بمشروع Supabase الخاص بك
const SUPABASE_URL = "https://eepmmmgxwfkkmjvkpudz.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcG1tbWd4d2Zra21qdmtwdWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MjA1MzQsImV4cCI6MjA5NDk5NjUzNH0.xfRkikruKDib_XXU8Acu4Aqdx5_mKzK-A1ln8_TpsnA"; // ضع هنا مفتاح الـ Anon الخاص بك من لوحة تحكم Supabase

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تصدير العميل للملفات الأخرى
window.supabase = supabase;
