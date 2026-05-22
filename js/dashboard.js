document.addEventListener("DOMContentLoaded", async () => {
    
    // ========================================================
    // 1. منطق الصفحة الرئيسية العامة (index.html)
    // ========================================================
    const authActionsContainer = document.getElementById('auth-actions');

    if (authActionsContainer) {
        // جلب بيانات الجلسة الحالية من نظام الحماية في سوبابيس
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
            // إذا كان المستخدم مسجل دخوله مسبقاً، نعرض له زر التوجه الفوري للداخل
            authActionsContainer.innerHTML = `
                <p style="font-size: 14px; margin-bottom: 20px; text-transform: uppercase;">أنت مسجّل الدخول حالياً كـ (${session.user.email})</p>
                <button onclick="window.location.href='dashboard.html'">الانتقال إلى لوحة التحكم</button>
            `;
        } else {
            // إذا كان زائراً جديداً، يتم عرض زر تسجيل الدخول وزر إنشاء حساب جديد بالتصميم الموحد
            authActionsContainer.innerHTML = `
                <button onclick="window.location.href='login.html'" style="margin-left: 15px;">تسجيل الدخول</button>
                <button onclick="window.location.href='register.html'" style="background-color: #000000; color: #ffffff;">إنشاء حساب جديد</button>
            `;
        }
    }

    // ========================================================
    // 2. منطق لوحة التحكم الخاصة بالأعضاء (dashboard.html)
    // ========================================================
    const dashboardCheck = document.getElementById('user-display-name');

    // نتحقق من وجود عنصر لوحة التحكم للتأكد أن المستخدم داخل صفحة dashboard.html
    if (dashboardCheck) {
        // أ) التحقق من حالة المستخدم وتأمين الصفحة
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // إذا لم يكن هناك مستخدم مسجل، يتم طرده فوراً لصفحة تسجيل الدخول لحماية البيانات
        if (!user || authError) {
            window.location.href = 'login.html';
            return;
        }

        // ب) جلب البروفايل الخاص بالمستخدم لمعرفة اسم المستخدم وصلاحيات الإدارة
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, is_admin')
            .eq('id', user.id)
            .single();

        if (profile) {
            // عرض اسم المستخدم في واجهة اللوحة
            dashboardCheck.innerText = profile.username;

            // التحقق مما إذا كان هذا الحساب أدمن، لإظهار زر التحكم الإداري المخفي
            if (profile.is_admin) {
                const adminBtn = document.getElementById('admin-panel-btn');
                const accountTypeStatus = document.getElementById('account-type-status');
                if (adminBtn) adminBtn.style.display = 'inline-block';
                if (accountTypeStatus) accountTypeStatus.innerText = 'المدير الرئيسي (Admin)';
            }
        }

        // جـ) جلب رصيد المحفظة المالي بدقة 4 أرقام عشرية وعرضه حياً للمدخل الحالي
        let { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();

        if (wallet) {
            const balanceEl = document.getElementById('wallet-balance');
            if (balanceEl) balanceEl.innerText = Number(wallet.balance).toFixed(4);
        }
    }

    // ========================================================
    // 3. معالجة وتأمين زر تسجيل الخروج المشترك (Logout)
    // ========================================================
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = 'login.html';
            } else {
                alert("حدث خطأ أثناء تسجيل الخروج: " + error.message);
            }
        });
    }
});
