import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Trophy, X, Filter, ArrowRight, Lock, Calendar } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

/* ---------------------------------------------------------------
   إعدادات Firebase — وصل التطبيق بقاعدة بيانات حقيقية دائمة
--------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: 'AIzaSyCs8d8Hnx99ZNl0-SQafQuf4CtQj40c69k',
  authDomain: 'wird-artaqaa.firebaseapp.com',
  projectId: 'wird-artaqaa',
  storageBucket: 'wird-artaqaa.firebasestorage.app',
  messagingSenderId: '967929700160',
  appId: '1:967929700160:web:b8371c19a2cf3c5ce264a5',
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ---------------------------------------------------------------
   بيانات ثابتة: أسماء الطالبات، المجموعات، والفئات
--------------------------------------------------------------- */
const NAMES = [
  'سارة', 'لين', 'جنى', 'دانة', 'رهف', 'لمى', 'غلا', 'وعد', 'تالا', 'ريم',
  'جود', 'سديم', 'لجين', 'شهد', 'ملك', 'رغد', 'فرح', 'هيا', 'نوف', 'بشائر',
  'أصايل', 'ريناد', 'لارين', 'عبير', 'مي', 'دلال', 'وطفاء', 'رند', 'أسيل', 'غيداء',
  'جواهر', 'نجود', 'شذى', 'أبرار', 'رهام', 'لوجين', 'سلمى', 'جنان', 'ندى', 'هتون',
  'أماني', 'بيان', 'تولين', 'وجدان', 'ريتاج', 'ليان', 'أريج', 'دانية', 'فاطمة', 'خلود', 'مضاوي'
];

const FORCED_THIRD_TIER_NAMES = ['مضاوي'];
const STUDENTS = NAMES.map((name, i) => {
  let tier = 'new';
  if (FORCED_THIRD_TIER_NAMES.includes(name)) tier = 'third';
  else if (i % 5 === 4) tier = 'second';
  else if (i % 7 === 6) tier = 'third';
  return { id: `s${i + 1}`, name, group: i % 2 === 0 ? 'coral' : 'pearl', tier };
});

const GROUPS = {
  coral: { label: 'مجموعة المرجان', emoji: '🪸', color: '#e11d48', bg: '#fff1f2' },
  pearl: { label: 'مجموعة اللؤلؤ', emoji: '🦪', color: '#0f766e', bg: '#f0fdfa' },
};

const TIER_BADGE = {
  new: null,
  second: { emoji: '⭐️', label: 'دفعة ثانية' },
  third: { emoji: '⛓️✨', label: 'دورة ثالثة' },
};

const SUPERVISORS = [
  { id: 'amjad', name: 'أستاذة أمجاد', code: '1111' },
  { id: 'batool', name: 'أستاذة البتول', code: '2222' },
];

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getWeekKey(d = new Date()) {
  const sat = new Date(d);
  sat.setDate(d.getDate() - ((d.getDay() - 6 + 7) % 7));
  return sat.toISOString().slice(0, 10);
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function useCycleClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayIndex = now.getDay(); // 0 = الأحد, 1 = الاثنين ...
  const dateKey = now.toISOString().slice(0, 10);
  const weekKey = getWeekKey(now);

  const cycleEnd = new Date(now);
  cycleEnd.setHours(23, 59, 59, 999);

  const formattedDate = now.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    now,
    todayIndex,
    dateKey,
    weekKey,
    formattedDate,
    dailyKey: `wird-daily_${dateKey}`,
    weeklyKey: `wird-weekly_${weekKey}`,
    challengeKey: `wed-challenge_${weekKey}`,
    msRemaining: cycleEnd.getTime() - now.getTime(),
  };
}

function getVisibleItems(displayIdx, tier, wedChallengeText) {
  const items = [];
  if ([0, 1, 2, 6].includes(displayIdx)) {
    items.push({ id: 'listen', label: 'سماع المقرر', desc: 'سماع النصاب 3 مرات من الشيخ.', emoji: '🎧', weekly: false });
    items.push({ id: 'recite', label: 'السرد مع رفيقة', desc: 'سرده مرتين بدون خطأ أو تنبيه أو لحن.', emoji: '🪸', weekly: false });
    items.push({ id: 'repeat', label: 'التكرار الذاتي', desc: 'التكرار 7 مرات (تسجيل صوتي أو بالورقة).', emoji: '🫧', weekly: false });
    items.push({ id: 'tafsir', label: 'التفسير', desc: 'قراءة تفسير النصاب.', emoji: '📖', weekly: false });
    items.push({ id: 'review', label: 'مراجعة السابق', desc: 'مراجعة الورد السابق', emoji: '🐬', weekly: false });
  }
  if (tier === 'second' && [0, 1, 2, 3, 6].includes(displayIdx)) {
    items.push({ id: 'majorReview', label: 'المراجعة الكبرى', desc: 'خاص بطالبات الدفعة الثانية', emoji: '⭐️', weekly: false });
  }
  if (tier === 'third' && [0, 1, 2, 3, 4, 6].includes(displayIdx)) {
    items.push({ id: 'cumulativeReview', label: 'المراجعة التراكمية', desc: 'خاص بطالبات الدورة الثالثة — تُنجز مرة واحدة في الأسبوع', emoji: '⛓️✨', weekly: true });
  }
  if (displayIdx === 3) {
    items.push({
      id: 'wedChallenge',
      label: 'تحدي الأربعاء',
      desc: wedChallengeText && wedChallengeText.trim() ? wedChallengeText : 'بانتظار المشرفة لكتابة تحدي هذا الأسبوع...',
      emoji: '🦪',
      weekly: false,
    });
  }
  return items;
}

function isItemDone(item, dailySaved, weeklySaved) {
  if (item.weekly) return !!weeklySaved?.[item.id]?.completed;
  return !!dailySaved?.items?.[item.id];
}

function percentFor(items, dailySaved, weeklySaved) {
  if (items.length === 0) return 0;
  const done = items.filter((it) => isItemDone(it, dailySaved, weeklySaved)).length;
  return Math.round((done / items.length) * 100);
}

function computeGroupAverages(dayIndex, challengeText, daily, weekly) {
  const sums = { coral: [], pearl: [] };
  STUDENTS.forEach((s) => {
    const items = getVisibleItems(dayIndex, s.tier, challengeText);
    const percent = percentFor(items, daily?.[s.id], weekly?.[s.id]);
    sums[s.group].push(percent);
  });
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  return { coral: avg(sums.coral), pearl: avg(sums.pearl) };
}

const PINS_KEY = `student-pins-v1`;

async function loadJSON(key) {
  try {
    const snap = await getDoc(doc(db, 'wird', key));
    if (!snap.exists()) return {};
    const value = snap.data().value;
    return value ? JSON.parse(value) : {};
  } catch (e) { return {}; }
}

async function saveJSON(key, data) {
  try {
    await setDoc(doc(db, 'wird', key), { value: JSON.stringify(data) });
    return true;
  } catch (e) { return false; }
}

async function saveChallengeText(key, text) {
  try {
    await setDoc(doc(db, 'wird', key), { value: text });
    return true;
  } catch (e) { return false; }
}

function PearlBar({ percent, count = 10, big = false }) {
  const filled = Math.round((percent / 100) * count);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: big ? '14px' : '10px',
            height: big ? '14px' : '10px',
            borderRadius: '50%',
            display: 'inline-block',
            border: '1px solid #2dd4bf',
            backgroundColor: i < filled ? '#2dd4bf' : '#e0f2fe',
            transition: 'all 0.3s'
          }}
        />
      ))}
    </div>
  );
}

function RaceLane({ emoji, percent, trackTint }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div dir="ltr" style={{ position: 'relative', height: '48px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e0f2fe', backgroundColor: trackTint }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', color: '#7dd3fc', userSelect: 'none' }}>
        <span style={{ fontSize: '14px' }}>🚩</span>
        <span style={{ fontSize: '18px' }}>🏆</span>
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, display: 'flex', alignItems: 'center', transition: 'all 0.7s ease-out', left: `calc(${clamped}% * 0.78 + 4%)` }}>
        <span style={{ fontSize: '24px' }}>{emoji}</span>
      </div>
    </div>
  );
}

function GroupRace({ coralPercent, pearlPercent }) {
  const diff = coralPercent - pearlPercent;
  let banner;
  if (coralPercent === 0 && pearlPercent === 0) {
    banner = '🌊 السباق لم يبدأ بعد.. من ستغطس أولاً؟';
  } else if (diff === 0) {
    banner = '🌊 تعادل مثير بين الفريقين! السباق مشتعل 🔥';
  } else if (diff > 0) {
    banner = `🪸 المرجان تتقدّم بفارق ${diff}%! هيا يا لؤلؤ 🏊‍♀️`;
  } else {
    banner = `🦪 اللؤلؤ تتقدّم بفارق ${Math.abs(diff)}%! هيا يا مرجان 🏊‍♀️`;
  }
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e0f2fe', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontSize: '18px' }}>🏊‍♀️</span>
        <h3 style={{ fontWeight: '800', color: '#334155', fontSize: '14px', margin: 0 }}>سباق اللآلئ بين الفريقين</h3>
      </div>
      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 12px 0' }}>{banner}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#e11d48', marginBottom: '4px' }}>
            <span>🪸 المرجان</span>
            <span>{coralPercent}%</span>
          </div>
          <RaceLane emoji="🐠" percent={coralPercent} trackTint="#fff1f2" />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#0f766e', marginBottom: '4px' }}>
            <span>🦪 اللؤلؤ</span>
            <span>{pearlPercent}%</span>
          </div>
          <RaceLane emoji="🐬" percent={pearlPercent} trackTint="#f0fdfa" />
        </div>
      </div>
    </div>
  );
}

function CelebrationModal({ onClose }) {
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    audio.play().catch(() => {});
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ position: 'relative', backgroundColor: '#ffffff', borderRadius: '28px', maxWidth: '320px', width: '100%', padding: '24px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', left: '12px', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <div style={{ fontSize: '50px', margin: '10px 0' }}>🦪✨</div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f766e', margin: '8px 0' }}>أحسنتِ يا لؤلؤة الحلقة! 🌟</h3>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0' }}>أتممتِ وردكِ اليوم بنجاح</p>
        <p style={{ color: '#d97706', fontWeight: 'bold', fontSize: '13px', margin: '12px 0' }}>لا تنسين إرسال البطاقة 🍯</p>
        <button onClick={onClose} style={{ width: '100%', backgroundColor: '#0d9488', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '10px' }}>
          الحمد لله 💙
        </button>
      </div>
    </div>
  );
}

function TopBar({ onExit, title, subtitle, formattedDate, countdownMs }) {
  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold' }}>
          <ArrowRight size={16} /> رجوع
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f766e' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 'bold' }}>{subtitle}</div>}
          {formattedDate && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>📅 {formattedDate}</div>}
        </div>
        <div style={{ width: '40px' }} />
      </div>
      {typeof countdownMs === 'number' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '20px', padding: '6px 12px', width: 'fit-content', margin: '10px auto 0' }}>
          <span>⏳ المتبقي لتسليم اليوم:</span>
          <span style={{ fontWeight: 'bold' }}>{formatDuration(countdownMs)}</span>
        </div>
      )}
    </div>
  );
}

function RoleSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
      <div style={{ fontSize: '40px', marginBottom: '8px' }}>🦪🌊🪸</div>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f766e', margin: '0 0 8px 0' }}>ارتقاء - غراس اللؤلؤ</h1>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
        من التلقين إلى الإتقان.. نرتقي بالحفظ معاً خطوة بخطوة 🌊✨
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
        <button
          onClick={() => onSelect('student')}
          style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e0f2fe', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '4px' }}>🦪</div>
          <div style={{ fontWeight: '800', color: '#0f766e', fontSize: '18px' }}>دخول الطالبة</div>
          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>تابعي ورَدكِ اليومي</div>
        </button>

        <button
          onClick={() => onSelect('supervisor')}
          style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e0f2fe', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '4px' }}>🪸</div>
          <div style={{ fontWeight: '800', color: '#e11d48', fontSize: '18px' }}>المشرفات</div>
          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>لوحة تحكم خاصة بالمشرفات</div>
        </button>
      </div>
    </div>
  );
}

function StudentFlow({ onExit }) {
  const clock = useCycleClock();
  const [pins, setPins] = useState(null);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [student, setStudent] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [daily, setDaily] = useState({});
  const [weekly, setWeekly] = useState({});
  const [challengeText, setChallengeText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // حالة اختيار اليوم للتصفح
  const [selectedDayIdx, setSelectedDayIdx] = useState(clock.todayIndex);

  useEffect(() => { loadJSON(PINS_KEY).then(setPins); }, []);

  // التحقق من الحفظ التلقائي على الجهاز (LocalStorage)
  useEffect(() => {
    const savedStudentId = localStorage.getItem('saved_student_id');
    if (savedStudentId) {
      const found = STUDENTS.find((s) => s.id === savedStudentId);
      if (found) setStudent(found);
    }
  }, []);

  useEffect(() => {
    if (!student) return;

    const unsubDaily = onSnapshot(doc(db, 'wird', clock.dailyKey), (snap) => {
      if (snap.exists() && snap.data().value) setDaily(JSON.parse(snap.data().value));
      else setDaily({});
    });

    const unsubWeekly = onSnapshot(doc(db, 'wird', clock.weeklyKey), (snap) => {
      if (snap.exists() && snap.data().value) setWeekly(JSON.parse(snap.data().value));
      else setWeekly({});
    });

    const unsubChallenge = onSnapshot(doc(db, 'wird', clock.challengeKey), (snap) => {
      if (snap.exists()) setChallengeText(snap.data().value || '');
      else setChallengeText('');
    });

    return () => { unsubDaily(); unsubWeekly(); unsubChallenge(); };
  }, [student, clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  const submitPin = async () => {
    if (!pendingStudent || !pins) return;
    const existing = pins[pendingStudent.id];
    if (existing) {
      if (pinInput === existing) {
        setStudent(pendingStudent);
        localStorage.setItem('saved_student_id', pendingStudent.id);
      } else {
        setPinError('الرمز غير صحيح، حاولي مجدداً');
      }
    } else {
      if (!/^\d{4}$/.test(pinInput)) {
        setPinError('الرمز يجب أن يكون 4 أرقام');
        return;
      }
      if (pinInput !== pinConfirm) {
        setPinError('الرمزان غير متطابقين');
        return;
      }
      const updated = { ...pins, [pendingStudent.id]: pinInput };
      setPins(updated);
      await saveJSON(PINS_KEY, updated);
      setStudent(pendingStudent);
      localStorage.setItem('saved_student_id', pendingStudent.id);
    }
  };

  const items = student ? getVisibleItems(selectedDayIdx, student.tier, challengeText) : [];
  const myDaily = student ? daily?.[student.id] : null;
  const myWeekly = student ? weekly?.[student.id] : null;
  const percent = useMemo(() => percentFor(items, myDaily, myWeekly), [items, myDaily, myWeekly]);
  const groupAverages = useMemo(() => computeGroupAverages(selectedDayIdx, challengeText, daily, weekly), [selectedDayIdx, challengeText, daily, weekly]);

  const toggleItem = async (item) => {
    if (!student) return;
    if (item.weekly) {
      const currentEntry = weekly[student.id] || {};
      const currentItem = currentEntry[item.id] || { completed: false, completedAt: null };
      const nowCompleted = !currentItem.completed;
      const updatedWeekly = {
        ...weekly,
        [student.id]: {
          ...currentEntry,
          [item.id]: { completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : null }
        }
      };
      setWeekly(updatedWeekly);
      await saveJSON(clock.weeklyKey, updatedWeekly);
      if (percentFor(items, myDaily, updatedWeekly[student.id]) === 100) setShowCelebration(true);
    } else {
      const current = daily[student.id] || { items: {}, completedAt: null };
      const newItems = { ...current.items, [item.id]: !current.items[item.id] };
      const newPercent = percentFor(items, { items: newItems }, myWeekly);
      const updatedDaily = {
        ...daily,
        [student.id]: {
          items: newItems,
          completedAt: newPercent === 100 ? current.completedAt || new Date().toISOString() : null
        }
      };
      setDaily(updatedDaily);
      await saveJSON(clock.dailyKey, updatedDaily);
      if (newPercent === 100 && current.completedAt == null) setShowCelebration(true);
    }
  };

  if (!student) {
    if (pendingStudent) {
      const hasPin = !!pins?.[pendingStudent.id];
      return (
        <div>
          <button onClick={() => setPendingStudent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
            <ArrowRight size={16} /> رجوع
          </button>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '36px' }}>🔒🦪</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f766e', margin: '8px 0' }}>{pendingStudent.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>{hasPin ? 'أدخلي رمزكِ السري (4 أرقام)' : 'أنشئي رمزكِ السري الخاص (4 أرقام)'}</p>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              style={{ width: '100%', textAlign: 'center', letterSpacing: '0.5em', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '18px', marginBottom: '10px' }}
            />
            {!hasPin && (
              <input
                type="password"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="تأكيد الرمز"
                style={{ width: '100%', textAlign: 'center', letterSpacing: '0.3em', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', marginBottom: '10px' }}
              />
            )}
            {pinError && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px' }}>{pinError}</div>}
            <button onClick={submitPin} style={{ width: '100%', backgroundColor: '#0d9488', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              {hasPin ? 'دخول' : 'حفظ ودخول'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <TopBar onExit={onExit} title="اختاري اسمكِ" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingLeft: '4px' }}>
          {STUDENTS.map((s) => {
            const badge = TIER_BADGE[s.tier];
            return (
              <button
                key={s.id}
                onClick={() => {
                  const savedPin = pins?.[s.id];
                  if (savedPin && localStorage.getItem('saved_student_id') === s.id) {
                    setStudent(s);
                  } else {
                    setPendingStudent(s);
                  }
                }}
                style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: `1px solid ${s.group === 'coral' ? '#ffe4e6' : '#ccfbf1'}`, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '20px' }}>{GROUPS[s.group].emoji}</div>
                <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '13px', marginTop: '2px' }}>{s.name}</div>
                {badge && <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>{badge.emoji} {badge.label}</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const teammates = STUDENTS.filter((s) => s.group === student.group);
  const g = GROUPS[student.group];

  return (
    <div>
      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}
      <TopBar
        onExit={() => {
          setStudent(null);
          setPendingStudent(null);
        }}
        title={`أهلاً، ${student.name} ${g.emoji}`}
        subtitle={DAY_NAMES[selectedDayIdx]}
        formattedDate={clock.formattedDate}
        countdownMs={clock.msRemaining}
      />

      {/* شريط الأيام لتصفح ورد أيام الأسبوع */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        {DAY_NAMES.map((name, idx) => {
          const isToday = idx === clock.todayIndex;
          const isSelected = idx === selectedDayIdx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedDayIdx(idx)}
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '1px solid',
                borderColor: isSelected ? '#0d9488' : '#e0f2fe',
                backgroundColor: isSelected ? '#0d9488' : isToday ? '#ccfbf1' : '#ffffff',
                color: isSelected ? '#ffffff' : isToday ? '#0f766e' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {name} {isToday && '📍'}
            </button>
          );
        })}
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: '800', color: '#0f766e', fontSize: '14px' }}>ورد يوم {DAY_NAMES[selectedDayIdx]}</span>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>{percent}%</span>
        </div>
        <PearlBar percent={percent} big />
      </div>

      <GroupRace coralPercent={groupAverages.coral} pearlPercent={groupAverages.pearl} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {items.map((it) => {
          const done = isItemDone(it, myDaily, myWeekly);
          return (
            <button
              key={it.id}
              onClick={() => toggleItem(it)}
              style={{ width: '100%', textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: '10px', borderRadius: '16px', border: `1px solid ${done ? '#86efac' : '#e0f2fe'}`, backgroundColor: done ? '#f0fdf4' : '#ffffff', padding: '12px', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '20px' }}>{it.emoji}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: done ? '#15803d' : '#334155', textDecoration: done ? 'line-through' : 'none' }}>{it.label}</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{it.desc}</span>
              </span>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${done ? '#22c55e' : '#cbd5e1'}`, backgroundColor: done ? '#22c55e' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                {done ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <h3 style={{ fontWeight: '800', fontSize: '14px', color: g.color, marginBottom: '8px' }}>صيد اللؤلؤ - {g.label}</h3>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e0f2fe', overflow: 'hidden' }}>
          {teammates.map((t) => {
            const tItems = getVisibleItems(selectedDayIdx, t.tier, challengeText);
            const tPercent = percentFor(tItems, daily[t.id], weekly[t.id]);
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', backgroundColor: t.id === student.id ? '#f0fdfa' : 'transparent' }}>
                <span style={{ fontSize: '12px', fontWeight: t.id === student.id ? '800' : 'normal', color: t.id === student.id ? '#0f766e' : '#475569' }}>
                  {t.name} {t.id === student.id && '(أنتِ)'}
                </span>
                <PearlBar percent={tPercent} count={7} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SupervisorFlow({ onExit }) {
  const [step, setStep] = useState('choose');
  const [chosen, setChosen] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  if (step === 'choose') {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
          <ArrowRight size={16} /> رجوع
        </button>
        <div style={{ fontSize: '36px' }}>🪸👩‍🏫</div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#e11d48', margin: '8px 0 16px' }}>من المشرفة؟</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SUPERVISORS.map((sup) => (
            <button key={sup.id} onClick={() => { setChosen(sup); setStep('password'); setErr(''); setCode(''); }} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
              {sup.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setStep('choose')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
          <ArrowRight size={16} /> رجوع
        </button>
        <div style={{ fontSize: '36px' }}>🔒</div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#e11d48', margin: '8px 0' }}>{chosen.name}</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>أدخلي كلمة المرور الخاصّة بكِ</p>
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="كلمة المرور" style={{ width: '100%', textAlign: 'center', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', marginBottom: '10px' }} />
        {err && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px' }}>{err}</div>}
        <button onClick={() => (code === chosen.code ? setStep('dashboard') : setErr('كلمة المرور غير صحيحة'))} style={{ width: '100%', backgroundColor: '#e11d48', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          دخول
        </button>
      </div>
    );
  }

  return <SupervisorDashboard onExit={onExit} supervisor={chosen} />;
}

/* ---------------------------------------------------------------
   لوحة تحكم المشرفات المكتملة والمجردة من المشاكل 🪸✨
--------------------------------------------------------------- */
function SupervisorDashboard({ onExit, supervisor }) {
  const clock = useCycleClock();
  const [daily, setDaily] = useState({});
  const [weekly, setWeekly] = useState({});
  const [pins, setPins] = useState({});
  const [challengeText, setChallengeText] = useState('');
  const [challengeDraft, setChallengeDraft] = useState('');
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubDaily = onSnapshot(doc(db, 'wird', clock.dailyKey), (snap) => {
      if (snap.exists() && snap.data().value) setDaily(JSON.parse(snap.data().value));
      else setDaily({});
    });

    const unsubWeekly = onSnapshot(doc(db, 'wird', clock.weeklyKey), (snap) => {
      if (snap.exists() && snap.data().value) setWeekly(JSON.parse(snap.data().value));
      else setWeekly({});
    });

    const unsubChallenge = onSnapshot(doc(db, 'wird', clock.challengeKey), (snap) => {
      if (snap.exists()) {
        const val = snap.data().value || '';
        setChallengeText(val);
        setChallengeDraft(val);
      }
    });

    loadJSON(PINS_KEY).then(setPins);

    return () => { unsubDaily(); unsubWeekly(); unsubChallenge(); };
  }, [clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  const resetPin = async (studentId) => {
    const updated = { ...pins };
    delete updated[studentId];
    setPins(updated);
    await saveJSON(PINS_KEY, updated);
  };

  const saveChallenge = async () => {
    setSavingChallenge(true);
    await saveChallengeText(clock.challengeKey, challengeDraft);
    setSavingChallenge(false);
  };

  const rows = useMemo(() => {
    return STUDENTS.map((s) => {
      const items = getVisibleItems(clock.todayIndex, s.tier, challengeText);
      const percent = percentFor(items, daily[s.id], weekly[s.id]);
      return { ...s, percent, completedAt: daily[s.id]?.completedAt || null };
    });
  }, [daily, weekly, clock.todayIndex, challengeText]);

  const groupAverages = useMemo(() => computeGroupAverages(clock.todayIndex, challengeText, daily, weekly), [clock.todayIndex, challengeText, daily, weekly]);

  const leaderboard = useMemo(() => {
    return rows
      .filter((r) => r.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .slice(0, 3);
  }, [rows]);

  const filteredRows = rows.filter((r) => {
    if (groupFilter !== 'all' && r.group !== groupFilter) return false;
    if (onlyPending && r.percent === 100) return false;
    if (search && !r.name.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <TopBar
        onExit={onExit}
        title={`أهلاً ${supervisor.name} 🪸`}
        subtitle={DAY_NAMES[clock.todayIndex]}
        formattedDate={clock.formattedDate}
        countdownMs={clock.msRemaining}
      />

      {/* سباق اللآلئ اللحظي */}
      <GroupRace coralPercent={groupAverages.coral} pearlPercent={groupAverages.pearl} />

      {/* كتابة وادارة تحدي الأربعاء */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e0f2fe', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '800', color: '#334155', fontSize: '13px', margin: '0 0 8px 0' }}>✍️ تحدي يوم الأربعاء الأسبوعي</h3>
        <textarea
          value={challengeDraft}
          onChange={(e) => setChallengeDraft(e.target.value)}
          placeholder="اكتبي نص التحدي للطالبات هنا..."
          rows={2}
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px', fontSize: '12px', resize: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={saveChallenge}
          disabled={savingChallenge}
          style={{ width: '100%', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginTop: '6px', cursor: 'pointer' }}
        >
          {savingChallenge ? 'جارِ الحفظ...' : 'حفظ التحدي'}
        </button>
      </div>

      {/* لوحة الشرف للأوائل */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e0f2fe', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '800', color: '#334155', fontSize: '13px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Trophy size={16} color="#f59e0b" /> الأوائل المكتملات اليوم
        </h3>
        {leaderboard.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>لم تُكمل أي طالبة الورد بعد اليوم 🐚</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {leaderboard.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdfa', borderRadius: '10px', padding: '6px 10px', fontSize: '12px' }}>
                <span>{['🥇', '🥈', '🥉'][i]} {r.name}</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>اكتمل ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* متابعة جميع الطالبات والبحث والفلترة */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '16px', border: '1px solid #e0f2fe' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحثي عن طالبة..."
            style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 10px', fontSize: '11px' }}
          />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px', fontSize: '11px', backgroundColor: '#fff' }}
          >
            <option value="all">الكل</option>
            <option value="coral">المرجان</option>
            <option value="pearl">اللؤلؤ</option>
          </select>
        </div>

        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredRows.map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#334155' }}>{GROUPS[r.group].emoji} {r.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PearlBar percent={r.percent} count={5} />
                <span style={{ fontSize: '11px', color: '#64748b', width: '28px' }}>{r.percent}%</span>
                {pins[r.id] && (
                  <button onClick={() => resetPin(r.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 0 }}>
                    <Lock size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);

  return (
    <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: '#eafcff', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '16px', fontFamily: 'Cairo, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ width: '100%', maxWidth: '380px', minHeight: '600px', backgroundColor: '#f8fafc', borderRadius: '32px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '4px solid #ffffff' }}>
        {role === null && <RoleSelect onSelect={setRole} />}
        {role === 'student' && <StudentFlow onExit={() => setRole(null)} />}
        {role === 'supervisor' && <SupervisorFlow onExit={() => setRole(null)} />}
      </div>
    </div>
  );
}
