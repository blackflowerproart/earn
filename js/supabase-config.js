// إعدادات الاتصال بمشروع Supabase الخاص بك
const SUPABASE_URL = "https://eepmmmgxwfkkmjvkpudz.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcG1tbWd4d2Zra21qdmtwdWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MjA1MzQsImV4cCI6MjA5NDk5NjUzNH0.xfRkikruKDib_XXU8Acu4Aqdx5_mKzK-A1ln8_TpsnA";

// قمنا بتغيير اسم المتغير المحلي إلى client لمنع التداخل والتعارض مع مكتبة سوبابيز الأساسية
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تصدير العميل للنطاق العام (Global Scope) لتتمكن جميع الملفات الأخرى مثل auth.js من قراءته مباشرة
window.supabase = client;
window._supabase = client; // حماية إضافية لضمان عمل كافة الملفات وسكربتات العمليات
