document.addEventListener("DOMContentLoaded", async () => {
    const authActionsContainer = document.getElementById('auth-actions');

    // التأكد من أننا في الصفحة الرئيسية (index.html) لمنع الأخطاء في الصفحات الأخرى
    if (authActionsContainer) {
        // 1. جلب بيانات الجلسة الحالية من Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
            // إذا كان المستخدم مسجل دخوله بالفعل، نعرض له زر الدخول المباشر للوحة التحكم
            authActionsContainer.innerHTML = `
                <p style="color: #10b981; font-weight: bold; margin-bottom: 15px;">أنت مسجّل الدخول بالفعل كـ (${session.user.email})</p>
                <button onclick="window.location.href='dashboard.html'" style="background-color: #3b82f6;">الانتقال إلى لوحة التحكم</button>
            `;
        } else {
            // إذا كان زائراً جديداً، نعرض له أزرار تسجيل الدخول وإنشاء الحساب
            authActionsContainer.innerHTML = `
                <button onclick="window.location.href='login.html'" style="margin-left: 10px;">تسجيل الدخول</button>
                <button onclick="window.location.href='register.html' " style="background-color: #2563eb;">إنشاء حساب جديد</button>
            `;
        }
    }
});
