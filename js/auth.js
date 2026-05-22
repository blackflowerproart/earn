document.addEventListener("DOMContentLoaded", () => {
    
    // ========================================================
    // 1. معالجة صفحة تسجيل الدخول (login.html)
    // ========================================================
    const loginForm = document.getElementById('login-form');
    const loginResponseMsg = document.getElementById('response-message');

    if (loginForm && loginResponseMsg) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // منع إعادة تحميل الصفحة

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            // إظهار رسالة الحالة وتجهيز الإطار المتقطع الأبيض
            loginResponseMsg.style.display = "block";
            loginResponseMsg.innerText = "جاري التحقق من البيانات...";

            // تسجيل الدخول عبر Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                loginResponseMsg.innerText = "خطأ: " + translateError(error.message);
            } else {
                loginResponseMsg.innerText = "تم تسجيل الدخول بنجاح! جاري التوجيه...";
                
                // الانتقال إلى لوحة التحكم بعد ثانية واحدة
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);
            }
        });
    }

    // ========================================================
    // 2. معالجة صفحة إنشاء الحساب (register.html)
    // ========================================================
    const registerForm = document.getElementById('register-form');
    const regResponseMsg = document.getElementById('reg-response-message');

    if (registerForm && regResponseMsg) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            regResponseMsg.style.display = "block";
            regResponseMsg.innerText = "جاري إنشاء الحساب الفني الخاص بك...";

            // أ) تسجيل المستخدم في نظام حماية الجلسات الأساسي
            const { data, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (authError) {
                regResponseMsg.innerText = "خطأ في التسجيل: " + translateError(authError.message);
                return;
            }

            const user = data.user;

            if (user) {
                // ب) إدخال البيانات في جدول البروفايلات العام Profiles
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { id: user.id, username: username, email: email, is_admin: false }
                    ]);

                if (profileError) {
                    regResponseMsg.innerText = "تم إنشاء الحساب ولكن حدث خطأ في تجهيز البيانات: " + profileError.message;
                    return;
                }

                // جـ) تهيئة محفظة رقمية فارغة للمستخدم برصيد 0.0000 تلقائياً
                await supabase.from('wallets').insert([{ user_id: user.id, balance: 0.0000 }]);

                regResponseMsg.innerText = "تم إنشاء الحساب والمحفظة بنجاح! يرجى مراجعة بريدك لتأكيده، ثم سجل دخولك.";
                registerForm.reset();
            }
        });
    }

    // ========================================================
    // 3. معالجة صفحة نسيت كلمة المرور (forgot-password.html)
    // ========================================================
    const forgotForm = document.getElementById('forgot-password-form');
    const forgotResponseMsg = document.getElementById('response-message'); // تستخدم نفس المعرف المشترك

    if (forgotForm && forgotResponseMsg) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value.trim();

            forgotResponseMsg.style.display = "block";
            forgotResponseMsg.innerText = "جاري إرسال طلب الاستعادة...";

            // طلب رابط تعيين كلمة المرور من Supabase Auth
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/settings.html', // التوجيه التلقائي لصفحة الإعدادات لتحديث كلمة المرور
            });

            if (error) {
                forgotResponseMsg.innerText = "خطأ: " + translateError(error.message);
            } else {
                forgotResponseMsg.innerText = "تم إرسال رابط إعادة التعيين لبريدك الإلكتروني! تفقد صندوق الوارد.";
                forgotForm.reset();
            }
        });
    }
});

// ========================================================
// 4. دالة مساعدة لترجمة أشهر أخطاء النظام إلى العربية
// ========================================================
function translateError(msg) {
    if (msg.includes("Invalid login credentials")) {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }
    if (msg.includes("Email not confirmed")) {
        return "يرجى تأكيد حسابك من خلال الرابط المرسل إلى بريدك الإلكتروني أولاً.";
    }
    if (msg.includes("User already registered")) {
        return "هذا البريد الإلكتروني مسجل بالفعل لدينا.";
    }
    if (msg.includes("Password should be at least")) {
        return "يجب ألا تقل كلمة المرور عن 6 خانات.";
    }
    return msg; // إرجاع النص الأصلي إذا كان الخطأ غير مدرج للتبسيط
}
