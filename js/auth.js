// الانتظار حتى يتم تحميل عناصر الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
    
    // التوثق التلقائي من اسم متغير السوبابيز المستخدم في الإعدادات
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
                // إرسال الرابط المباشر لصفحة الاستعادة على جيتهب بيجز الموثقة في السوبابيز
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: 'https://blackflowerproart.github.io/earn/reset-password.html', 
                });

                if (error) throw error;

                showMessage(responseMessage, 'Password reset link has been sent to your email.', true);
                forgotPasswordForm.reset();

            } catch (error) {
