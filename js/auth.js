// منطق إنشاء حساب جديد
const registerForm = document.getElementById('register-form');
const regResponseMsg = document.getElementById('reg-response-message');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        regResponseMsg.style.color = "#333";
        regResponseMsg.innerText = "جاري إنشاء الحساب الفني الخاص بك...";

        // 1. تسجيل المستخدم في نظام حماية Supabase Auth
        const { data, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            regResponseMsg.style.color = "#ef4444";
            regResponseMsg.innerText = "خطأ في التسجيل: " + authError.message;
            return;
        }

        const user = data.user;

        if (user) {
            // 2. إدخال بيانات المستخدم في جدول البروفايل Profiles بعد نجاح عملية الـ Auth
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    { id: user.id, username: username, email: email, is_admin: false }
                ]);

            if (profileError) {
                regResponseMsg.style.color = "#ef4444";
                regResponseMsg.innerText = "تم إنشاء الحساب ولكن حدث خطأ أثناء تجهيز البروفايل: " + profileError.message;
                return;
            }

            // 3. إنشاء محفظة مالية فارغة تلقائياً للمستخدم الجديد برصيد 0.0000
            await supabase.from('wallets').insert([{ user_id: user.id, balance: 0.0000 }]);

            regResponseMsg.style.color = "#10b981";
            regResponseMsg.innerText = "تم إنشاء الحساب والمحفظة الرقمية بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب، ثم توجه لصفحة تسجيل الدخول.";
            registerForm.reset();
        }
    });
}
