/**
 * The BlackFlower - Dashboard Subsystem
 * نظام إدارة لوحة التحكم وجلب بيانات الرتب والمحفظة من جدول profiles
 */

document.addEventListener('DOMContentLoaded', () => {
    // تشغيل الدالة الأساسية لفحص الجلسة وجلب البيانات
    initDashboard();

    // ربط حدث تسجيل الخروج بالزر المخصص له
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

/**
 * الدالة الرئيسية لتهيئة لوحة التحكم
 */
async function initDashboard() {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            console.error("Supabase is not defined. Check your supabase-config.js file.");
            return;
        }

        // 1. التحقق من وجود مستخدم مسجل دخول حالياً
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn("Access denied. Redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        // 2. جلب البيانات مباشرة من جدول profiles الخاص بك
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, wallet_balance, current_rank')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching user profile:", profileError.message);
            document.getElementById('user-display-name').textContent = "Error Loading";
            return;
        }

        // 3. تأمين الكود: إذا كان الجدول فارغاً للحساب الحالي، نقوم بإنشاء سجل افتراضي له فوراً
        if (!profile) {
            console.log("Profile row dynamic creation...");
            const defaultUsername = user.email ? user.email.split('@')[0] : 'User_' + user.id.substring(0, 5);
            
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([
                    { 
                        id: user.id, 
                        username: defaultUsername, 
                        wallet_balance: 0.0000, 
                        total_deposited: 0.0000, 
                        ads_watched_count: 0, 
                        current_rank: 'Standard' 
                    }
                ])
                .select()
                .single();

            if (createError) {
                console.error("Failed to create profile row:", createError.message);
                return;
            }
            profile = newProfile;
        }

        // 4. تحديث واجهة المستخدم بالبيانات الصحيحة
        updateDashboardUI(profile);

        // 5. فحص صلاحيات الأدمن (بالاعتماد على جدول profiles)
        checkAdminStatus(user.id);

    } catch (err) {
        console.error("Unexpected error in dashboard initialization:", err);
    }
}

/**
 * تحديث عناصر واجهة المستخدم بالبيانات الحقيقية وتلوين الرتب
 */
function updateDashboardUI(profile) {
    const nameElement = document.getElementById('user-display-name');
    const balanceElement = document.getElementById('wallet-balance');
    const rankElement = document.getElementById('account-type-status');

    if (nameElement) nameElement.textContent = profile.username || 'Anonymous User';
    if (balanceElement) balanceElement.textContent = parseFloat(profile.wallet_balance || 0).toFixed(4);
    
    if (rankElement) {
        // إذا كان حقل الرتبة فارغاً في قاعدة البيانات نضع القيمة الافتراضية Standard
        const userRank = profile.current_rank || 'Standard';
        rankElement.textContent = userRank;

        // تطبيق الألوان والتأثيرات بحسب الرتب المعتمدة لمشروعك
        switch (userRank) {
            case 'BlackFlower Legend':
                rankElement.style.color = '#ff00ff'; // أرجواني نيون للرتبة الأسطورية
                rankElement.style.fontWeight = 'bold';
                rankElement.style.textShadow = '0 0 12px rgba(255, 0, 255, 0.8)';
                break;
                
            case 'Bronze Elite':
                rankElement.style.color = '#cd7f32'; // برونزي احترافي للمستوى الثاني
                rankElement.style.fontWeight = 'bold';
                rankElement.style.textShadow = '0 0 5px rgba(205, 127, 50, 0.5)';
                break;
                
            case 'Standard':
            default:
                rankElement.style.color = '#aaaaaa'; // رمادي كلاسيكي للمبتدئين
                rankElement.style.textShadow = 'none';
                break;
        }
    }
}

/**
 * التحقق من رتبة المسؤول (Admin) بإستخدام جدول profiles
 */
async function checkAdminStatus(userId) {
    const adminBtn = document.getElementById('admin-panel-btn');
    if (!adminBtn) return;

    const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

    if (!error && data && data.is_admin === true) {
        adminBtn.style.display = 'block';
    } else {
        adminBtn.style.display = 'none';
    }
}

/**
 * خروج آمن للمستخدم وتنظيف الجلسة
 */
async function handleLogout(event) {
    event.preventDefault();
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("Error logging out: " + error.message);
    } else {
        window.location.href = 'login.html'; 
    }
}
// دالة جلب وعرض رصيد المحفظة للمستخدم الحالي
async function fetchAndDisplayWalletBalance() {
    try {
        // 1. التأكد من أن المستخدم مسجل الدخول وجلب بياناته
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log("User is not logged in.");
            document.getElementById('wallet-balance').innerText = "0.0000";
            return;
        }

        // 2. جلب سطر الرصيد من جدول wallets المطابق للـ user_id
        const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single(); // جلب سطر واحد فقط صراحة

        if (walletError) {
            // إذا لم تكن المحفظة منشأة بعد في الجدول، اعرض صفر
            if (walletError.code === 'PGRST116') { 
                console.log("No wallet row found for this user. Displaying 0.00");
                document.getElementById('wallet-balance').innerText = "0.0000";
            } else {
                throw walletError;
            }
            return;
        }

        // 3. تحديث النص داخل عنصر الـ HTML لعرض الرصيد بدقة 4 أرقام بعد الفاصلة
        if (walletData && walletData.balance !== undefined) {
            const formattedBalance = parseFloat(walletData.balance).toFixed(4);
            document.getElementById('wallet-balance').innerText = formattedBalance;
        }

    } catch (error) {
        console.error("Error fetching wallet balance:", error.message);
        document.getElementById('wallet-balance').innerText = "ERROR";
    }
}

// استدعاء الدالة تلقائياً عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // تأكد من أن كائن سوبابيز معرف قبل الاستدعاء
    if (typeof supabase !== 'undefined') {
        fetchAndDisplayWalletBalance();
    }
});
