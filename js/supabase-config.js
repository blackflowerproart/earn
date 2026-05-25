/**
 * The BlackFlower - Supabase Configuration
 * ملف إعدادات الاتصال بقاعدة بيانات سوبابيس وتصدير العميل للمتصفح
 */

// 1. ضع هنا رابط مشروعك الخاص (تجدها في إعدادات Supabase -> API)
const SUPABASE_URL = 'https://eepmmmgxwfkkmjvkpudz.supabase.co'; 

// 2. ضع هنا مفتاح الـ Anon Key الخاص بمشروعك
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcG1tbWd4d2Zra21qdmtwdWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MjA1MzQsImV4cCI6MjA5NDk5NjUzNH0.xfRkikruKDib_XXU8Acu4Aqdx5_mKzK-A1ln8_TpsnA';

try {
    // التحقق من أن المكتبة تم تحميلها بنجاح عبر الـ CDN في صفحة الـ HTML
    if (typeof supabase === 'undefined') {
        throw new Error("Supabase CDN library is missing. Please check your HTML script tags order.");
    }

    // 3. إنشاء العميل وتخزينه في كائن النافذة العالمي (window) ليصبح متاحاً في كل مكان
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log("▲ The BlackFlower: Supabase initialized successfully.");

} catch (error) {
    console.error("▲ The BlackFlower [Initialization Error]:", error.message);
}
