// الانتظار حتى يتم تحميل عناصر الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. معالجة عملية التسجيل (Sign Up)
    // ==========================================
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // منع الصفحة من إعادة التحميل

            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const responseMessage = document.getElementById('reg-response-message');
            const registerBtn = document.getElementById('register-btn');

            // تغيير حالة الزر أثناء المعالجة
            registerBtn.disabled = true;
            registerBtn.innerText = 'Registering...';
            showMessage(responseMessage, '', false);

            try {
                // استخدام دالة Supabase لإنشاء الحساب وحفظ الـ username في الـ metadata
                const { data, error } = await _supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username
                        }
                    }
                });

                if (error) throw error;

                // التحقق مما إذا كان تفعيل البريد الإلكتروني مطلوباً
                if (data.user && data.session === null) {
                    showMessage(responseMessage, 'Registration successful! Please check your email to verify your account.', true);
                    registerForm.reset();
                } else {
                    showMessage(responseMessage, 'Registration successful! Redirecting...', true);
                    // التوجيه إلى لوحة التحكم (dashboard) في حال الدخول المباشر
                    setTimeout(() => window.location.href = 'dashboard.html', 2000);
                }

            } catch (error) {
                showMessage(responseMessage, `Error: ${error.message}`, false);
            } finally {
                registerBtn.disabled = false;
                registerBtn.innerText = 'Register';
            }
        });
    }

    // ==========================================
    // 2. معالجة عملية تسجيل الدخول (Sign In)
    // ==========================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const responseMessage = document.getElementById('response-message');
            const loginBtn = document.getElementById('login-btn');

            loginBtn.disabled = true;
            loginBtn.innerText = 'Logging in...';
            showMessage(responseMessage, '', false);

            try {
                const { data, error } = await _supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                showMessage(responseMessage, 'Login successful! Redirecting...', true);
                // التوجيه إلى لوحة التحكم بعد نجاح الدخول
                setTimeout(() => window.location.href = 'dashboard.html', 1500);

            } catch (error) {
                showMessage(responseMessage, `Error: ${error.message}`, false);
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerText = 'Login';
            }
        });
    }

    // ==========================================
    // 3. معالجة استعادة كلمة المرور (Forgot Password)
    // ==========================================
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('reset-email').value.trim();
            const responseMessage = document.getElementById('response-message');
            const resetBtn = document.getElementById('reset-btn');

            resetBtn.disabled = true;
            resetBtn.innerText = 'Sending...';
            showMessage(responseMessage, '', false);

            try {
                const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html', // صفحة تعيين الباسورد الجديد
                });

                if (error) throw error;

                showMessage(responseMessage, 'Password reset link has been sent to your email.', true);
                forgotPasswordForm.reset();

            } catch (error) {
                showMessage(responseMessage, `Error: ${error.message}`, false);
            } finally {
                resetBtn.disabled = false;
                resetBtn.innerText = 'Send Reset Link';
            }
        });
    }
});

// دالة مساعدة لعرض الرسائل للمستخدم وتغيير لونها حسب الحالة
function showMessage(element, text, isSuccess) {
    if (!element) return;
    
    if (text === '') {
        element.style.display = 'none';
        element.innerText = '';
        return;
    }

    element.style.display = 'block';
    element.innerText = text;
    // تخصيص الألوان لتناسب طابع موقعك الأسود (أخضر للنجاح، أحمر خفيف للخطأ)
    element.style.color = isSuccess ? '#00ff77' : '#ff4444';
    element.style.marginTop = '15px';
    element.style.textAlign = 'center';
    element.style.fontSize = '0.9rem';
}
