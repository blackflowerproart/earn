document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. التحقق من حالة المستخدم وتأمين الصفحة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // إذا لم يكن هناك مستخدم مسجل، يتم طرده فوراً لصفحة تسجيل الدخول لحماية الصفحة
    if (!user || authError) {
        window.location.href = 'login.html';
        return;
    }

    // 2. جلب البروفايل الخاص بالمستخدم لمعرفة اسم المستخدم وصلاحيات الإدارة
    let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_admin')
        .eq('id', user.id)
        .single();

    if (profile) {
        // عرض اسم المستخدم في واجهة اللوحة
        const displayNameEl = document.getElementById('user-display-name');
        if (displayNameEl) displayNameEl.innerText = profile.username;

        // التحقق مما إذا كان هذا الحساب أدمن، لإظهار زر التحكم الإداري المخفي
        if (profile.is_admin) {
            const adminBtn = document.getElementById('admin-panel-btn');
            const accountTypeStatus = document.getElementById('account-type-status');
            if (adminBtn) adminBtn.style.display = 'inline-block';
            if (accountTypeStatus) accountTypeStatus.innerText = 'المدير الرئيسي (Admin)';
        }
    }

    // 3. جلب رصيد المحفظة المالي بدقة 4 أرقام عشرية وعرضه حياً للمستخدم
    let { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    if (wallet) {
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) balanceEl.innerText = Number(wallet.balance).toFixed(4);
    }

    // 4. معالجة وتأمين زر تسجيل الخروج (Logout) وتدمير الجلسة الحالية
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
