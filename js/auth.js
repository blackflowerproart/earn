// الانتظار حتى يتم تحميل عناصر الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
    
    const supabaseClient = (typeof _supabase !== 'undefined') ? _supabase : (typeof supabase !== 'undefined' ? supabase : null);

    if (!supabaseClient) {
        console.error("Supabase client is not initialized. Please check your supabase-config.js file.");
        return;
    }

    // ==========================================
    // 1. معالجة عملية التسجيل (Sign Up) والإدخال في جدول profiles
    // ==========================================
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const responseMessage = document.getElementById('reg-response-message');
            const registerBtn = document.getElementById('register-btn');

            registerBtn.disabled = true;
            registerBtn.innerText = 'Registering...';
            showMessage(responseMessage, '', false);

            try {
                // الخطوة أ: إنشاء الحساب الأساسي في نظام Auth
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username
                        }
                    }
                });

                if (error) throw error;

                // الخطوة ب: إدخال البيانات المخصصة في جدول profiles العام باستخدام الـ id الجديد
                if (data.user) {
                    const { error: profileError } = await supabaseClient
                        .from('profiles')
                        .insert([
                            { 
                                id: data.user.id, 
                                username: username, 
                                email: email 
                            }
                        ]);

                    if (profileError) {
                        console.error("Error inserting into profiles table:", profileError.message);
                    }
                }

                if (data.user && data.session === null) {
                    showMessage(responseMessage, 'Registration successful! Please check your email to verify your account.', true);
                    registerForm.reset();
                } else {
                    showMessage(responseMessage, 'Registration successful! Redirecting...', true);
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
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                showMessage(responseMessage, 'Login successful! Redirecting...', true);
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
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html',
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

function showMessage(element, text, isSuccess) {
    if (!element) return;
    
    if (text === '') {
        element.style.display = 'none';
        element.innerText = '';
        return;
    }

    element.style.display = 'block';
    element.innerText = text;
    element.style.color = isSuccess ? '#00ff77' : '#ff4444';
    element.style.marginTop = '15px';
    element.style.textAlign = 'center';
    element.style.fontSize = '0.9rem';
}
// ==========================================
    // 4. معالجة حفظ كلمة المرور الجديدة (Update Password)
    // ==========================================
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const responseMessage = document.getElementById('reset-msg');
            const updateBtn = document.getElementById('update-pass-btn');

            // التأكد من تطابق كلمتي المرور
            if (newPassword !== confirmPassword) {
                showMessage(responseMessage, "Error: Passwords do not match!", false);
                return;
            }

            updateBtn.disabled = true;
            updateBtn.innerText = 'Updating...';
            showMessage(responseMessage, '', false);

            try {
                // تحديث كلمة المرور للمستخدم الحالي الموثق عبر رابط البريد الإلكتروني
                const { error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                showMessage(responseMessage, 'Password updated successfully! Redirecting to login...', true);
                resetPasswordForm.reset();
                
                // التوجيه لصفحة تسجيل الدخول بعد النجاح بـ 2 ثانية
                setTimeout(() => window.location.href = 'login.html', 2500);

            } catch (error) {
                showMessage(responseMessage, `Error: ${error.message}`, false);
            } finally {
                updateBtn.disabled = false;
                updateBtn.innerText = 'Update Password';
            }
        });
    }
