import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Trophy, X, Filter, ArrowRight, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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
   بيانات ثابتة: أسماء الطالبات، المجموعات، والفئات (الدورات)
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
  return {
    id: `s${i + 1}`,
    name,
    group: i % 2 === 0 ? 'coral' : 'pearl',
    tier,
  };
});

const GROUPS = {
  coral: {
    label: 'مجموعة المرجان',
    emoji: '🪸',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  pearl: {
    label: 'مجموعة اللؤلؤ',
    emoji: '🦪',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
  },
};

const TIER_BADGE = {
  new: null,
  second: { emoji: '⭐️', label: 'دفعة ثانية' },
  third: { emoji: '⛓️✨', label: 'دورة ثالثة' },
};

const COURSE_DATES = { start: '٢٣ ربيع الأول', end: '٢٢ ربيع الثاني' };

const SUPERVISORS = [
  { id: 'amjad', name: 'أستاذة أمجاد', code: '1111' },
  { id: 'batool', name: 'أستاذة البتول', code: '2222' },
];

const DAY_NAMES_BY_INDEX = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

const CUTOFF_HOUR = 16;
const CUTOFF_MIN = 30;

function getWeekKey(d = new Date()) {
  const day = d.getDay();
  const diff = (day - 6 + 7) % 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() - diff);
  return sat.toISOString().slice(0, 10);
}

function getCycleStart(now) {
  const c = new Date(now);
  c.setHours(CUTOFF_HOUR, CUTOFF_MIN, 0, 0);
  if (now.getTime() < c.getTime()) c.setDate(c.getDate() - 1);
  return c;
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
  const cycleStart = getCycleStart(now);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 1);
  const dateKey = cycleStart.toISOString().slice(0, 10);
  const weekKey = getWeekKey(cycleStart);
  return {
    now,
    dayIndex: cycleStart.getDay(),
    dailyKey: `wird-daily_${dateKey}`,
    weeklyKey: `wird-weekly_${weekKey}`,
    challengeKey: `wed-challenge_${weekKey}`,
    msRemaining: cycleEnd.getTime() - now.getTime(),
  };
}

function getVisibleItems(displayIdx, tier, wedChallengeText) {
  const items = [];
  const basicDays = [6, 0, 1, 2];
  if (basicDays.includes(displayIdx)) {
    items.push({ id: 'listen', label: 'سماع المقرر', desc: 'سماع النصاب 3 مرات من الشيخ.', emoji: '🎧', weekly: false });
    items.push({ id: 'recite', label: 'السرد مع رفيقة', desc: 'سرده مرتين بدون خطأ أو تنبيه أو لحن.', emoji: '🪸', weekly: false });
    items.push({ id: 'repeat', label: 'التكرار الذاتي', desc: 'التكرار 7 مرات (تسجيل صوتي أو بالورقة).', emoji: '🫧', weekly: false });
    items.push({ id: 'tafsir', label: 'التفسير', desc: 'قراءة تفسير النصاب.', emoji: '📖', weekly: false });
    items.push({ id: 'review', label: 'مراجعة السابق', desc: 'مراجعة الورد السابق', emoji: '🐬', weekly: false });
  }
  if (tier === 'second' && [6, 0, 1, 2, 3].includes(displayIdx)) {
    items.push({ id: 'majorReview', label: 'المراجعة الكبرى', desc: 'خاص بطالبات الدفعة الثانية', emoji: '⭐️', weekly: false });
  }
  if (tier === 'third' && [6, 0, 1, 2, 3, 4].includes(displayIdx)) {
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
  } catch (e) {
    return {};
  }
}

async function saveJSON(key, data) {
  try {
    await setDoc(doc(db, 'wird', key), { value: JSON.stringify(data) });
    return true;
  } catch (e) {
    return false;
  }
}

async function loadChallengeText(key) {
  try {
    const snap = await getDoc(doc(db, 'wird', key));
    return snap.exists() ? snap.data().value || '' : '';
  } catch (e) {
    return '';
  }
}

async function saveChallengeText(key, text) {
  try {
    await setDoc(doc(db, 'wird', key), { value: text });
    return true;
  } catch (e) {
    return false;
  }
}

function PearlBar({ percent, count = 10, big = false }) {
  const filled = Math.round((percent / 100) * count);
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={
            (big ? 'w-3.5 h-3.5 ' : 'w-2.5 h-2.5 ') +
            'rounded-full inline-block ring-1 transition-all duration-300 ' +
            (i < filled
              ? 'bg-gradient-to-br from-white via-cyan-100 to-teal-400 ring-teal-400 shadow-sm'
              : 'bg-sky-100 ring-sky-200')
          }
        />
      ))}
    </div>
  );
}

function RaceLane({ emoji, percent, trackTint, burst }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div dir="ltr" className={'relative h-14 rounded-full overflow-hidden border border-sky-100 ' + trackTint}>
      <div className="absolute inset-0 flex items-center justify-between px-4 text-sky-300 select-none">
        <span className="text-base opacity-70">🚩</span>
        <span className="text-xl">🏆</span>
      </div>
      <div className="absolute inset-y-0 flex items-center transition-all duration-700 ease-out" style={{ left: `calc(${clamped}% * 0.78 + 4%)` }}>
        <div className="relative">
          {burst && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg splash-pop">💦</span>}
          <span className="text-2xl inline-block swim-wiggle drop-shadow">{emoji}</span>
          <span className="absolute -bottom-1 -left-3 text-[10px] bubble-a">🫧</span>
          <span className="absolute -bottom-2 -left-5 text-[9px] bubble-b">🫧</span>
        </div>
      </div>
    </div>
  );
}

function GroupRace({ coralPercent, pearlPercent, coralBurst, pearlBurst }) {
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
    <div className="bg-white/90 rounded-2xl border border-sky-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏊‍♀️</span>
        <h3 className="font-extrabold text-slate-700 text-sm">سباق اللآلئ بين الفريقين</h3>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">{banner}</p>
      <div className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1 text-xs font-bold text-rose-600">
            <span>🪸 المرجان</span>
            <span>{coralPercent}%</span>
          </div>
          <RaceLane emoji="🐠" percent={coralPercent} trackTint="bg-rose-50/60" burst={coralBurst} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1 text-xs font-bold text-teal-700">
            <span>🦪 اللؤلؤ</span>
            <span>{pearlPercent}%</span>
          </div>
          <RaceLane emoji="🐬" percent={pearlPercent} trackTint="bg-teal-50/60" burst={pearlBurst} />
        </div>
      </div>
    </div>
  );
}

function useGroupRace(dayIndex, challengeText, daily, weekly) {
  const [averages, setAverages] = useState({ coral: 0, pearl: 0 });
  const [burst, setBurst] = useState({ coral: false, pearl: false });
  const prevRef = useRef({ coral: 0, pearl: 0 });

  useEffect(() => {
    if (!daily || !weekly) return;
    const avg = computeGroupAverages(dayIndex, challengeText, daily, weekly);
    setAverages(avg);
    const prev = prevRef.current;
    const rose = { coral: avg.coral > prev.coral, pearl: avg.pearl > prev.pearl };
    prevRef.current = avg;
    if (rose.coral || rose.pearl) {
      setBurst(rose);
      const t = setTimeout(() => setBurst({ coral: false, pearl: false }), 900);
      return () => clearTimeout(t);
    }
  }, [dayIndex, challengeText, daily, weekly]);

  return { averages, burst };
}

function CelebrationModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/60 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xs w-full p-6 text-center overflow-hidden pop-in">
        <button onClick={onClose} className="absolute top-3 left-3 text-sky-400 hover:text-sky-600">
          <X size={20} />
        </button>
        <div className="relative h-24 flex items-center justify-center">
          <span className="absolute text-lg sparkle" style={{ left: '20%', top: '10%', animationDelay: '0.2s' }}>✨</span>
          <span className="absolute text-lg sparkle" style={{ right: '18%', top: '5%', animationDelay: '0.5s' }}>✨</span>
          <span className="text-5xl float-wave">🦪</span>
        </div>
        <h3 className="text-xl font-extrabold text-teal-700 mt-1">أحسنتِ يا لؤلؤة الحلقة! 🌟</h3>
        <p className="text-xs text-slate-500 mt-1">أتممتِ وردكِ اليوم بنجاح</p>
        <p className="text-amber-600 font-bold text-xs mt-2">لا تنسين إرسال البطاقة 🍯</p>
        <button onClick={onClose} className="mt-5 w-full bg-gradient-to-l from-teal-500 to-cyan-500 text-white font-bold py-2.5 rounded-xl shadow-md hover:opacity-90 transition text-sm">
          الحمد لله 💙
        </button>
      </div>
    </div>
  );
}

function TopBar({ onExit, title, subtitle, countdownMs }) {
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-1 text-slate-400 hover:text-teal-600 text-xs font-bold">
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="text-center">
          <div className="font-extrabold text-teal-700 text-base">{title}</div>
          {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
        </div>
        <div className="w-12" />
      </div>
      {typeof countdownMs === 'number' && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full py-1 px-3 w-fit mx-auto">
          <span>⏳ الوقت المتبقي لورد اليوم:</span>
          <span className="font-bold tabular-nums" dir="ltr">{formatDuration(countdownMs)}</span>
        </div>
      )}
    </div>
  );
}

function RoleSelect({ onSelect }) {
  return (
    <div className="min-h-[580px] flex flex-col items-center justify-center p-4 text-center">
      <div className="text-4xl mb-1">🦪🌊🪸</div>
      <h1 className="text-2xl font-extrabold text-teal-700">ارتقاء - غراس اللؤلؤ</h1>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs">
        من التلقين إلى الإتقان.. نرتقي بالحفظ معاً خطوة بخطوة 🌊✨
      </p>
      <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-teal-600 font-bold bg-teal-50/80 px-3 py-1 rounded-full">
        <span>🗓 البداية: {COURSE_DATES.start}</span>
        <span className="text-sky-300">|</span>
        <span>النهائي: {COURSE_DATES.end}</span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 w-full mt-6 px-2">
        <button
          onClick={() => onSelect('student')}
          className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5 text-center hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="text-4xl mb-1">🦪</div>
          <div className="font-extrabold text-teal-700 text-base">دخول الطالبة</div>
          <div className="text-slate-400 text-xs mt-0.5">تابعي ورَدكِ اليومي</div>
        </button>

        <button
          onClick={() => onSelect('supervisor')}
          className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5 text-center hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="text-4xl mb-1">🪸</div>
          <div className="font-extrabold text-rose-600 text-base">المشرفات</div>
          <div className="text-slate-400 text-xs mt-0.5">لوحة تحكم خاصة بالمشرفات</div>
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
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [challengeText, setChallengeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadJSON(PINS_KEY).then(setPins);
  }, []);

  const fetchData = useCallback(() => {
    return Promise.all([
      loadJSON(clock.dailyKey),
      loadJSON(clock.weeklyKey),
      loadChallengeText(clock.challengeKey),
    ]);
  }, [clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    fetchData().then(([d, w, c]) => {
      setDaily(d);
      setWeekly(w);
      setChallengeText(c);
      setLoading(false);
    });
  }, [student, fetchData]);

  useEffect(() => {
    if (!student) return;
    const iv = setInterval(() => {
      fetchData().then(([d, w, c]) => {
        setDaily(d);
        setWeekly(w);
        setChallengeText(c);
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [student, fetchData]);

  const submitPin = async () => {
    if (!pendingStudent || !pins) return;
    const existing = pins[pendingStudent.id];
    if (existing) {
      if (pinInput === existing) {
        setStudent(pendingStudent);
        setPinInput('');
        setPinError('');
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
      setPinInput('');
      setPinConfirm('');
      setPinError('');
    }
  };

  const items = student ? getVisibleItems(clock.dayIndex, student.tier, challengeText) : [];
  const myDaily = student ? daily?.[student.id] : null;
  const myWeekly = student ? weekly?.[student.id] : null;
  const percent = useMemo(() => percentFor(items, myDaily, myWeekly), [items, myDaily, myWeekly]);
  const { averages: groupAverages, burst: groupBurst } = useGroupRace(clock.dayIndex, challengeText, daily, weekly);

  const toggleItem = useCallback(
    async (item) => {
      if (!student || !daily || !weekly) return;
      if (item.weekly) {
        const currentEntry = weekly[student.id] || {};
        const currentItem = currentEntry[item.id] || { completed: false, completedAt: null };
        const nowCompleted = !currentItem.completed;
        const updatedEntry = {
          ...currentEntry,
          [item.id]: {
            completed: nowCompleted,
            completedAt: nowCompleted ? new Date().toISOString() : null,
          },
        };
        const updatedWeekly = { ...weekly, [student.id]: updatedEntry };
        setWeekly(updatedWeekly);
        await saveJSON(clock.weeklyKey, updatedWeekly);
        const newPercent = percentFor(items, myDaily, updatedWeekly[student.id]);
        if (newPercent === 100) setShowCelebration(true);
      } else {
        const current = daily[student.id] || { items: {}, completedAt: null };
        const newItems = { ...current.items, [item.id]: !current.items[item.id] };
        const newPercent = percentFor(items, { items: newItems }, myWeekly);
        const wasComplete = current.completedAt != null;
        const nowComplete = newPercent === 100;
        const updatedEntry = {
          items: newItems,
          completedAt: nowComplete ? current.completedAt || new Date().toISOString() : null,
        };
        const updatedDaily = { ...daily, [student.id]: updatedEntry };
        setDaily(updatedDaily);
        await saveJSON(clock.dailyKey, updatedDaily);
        if (nowComplete && !wasComplete) setShowCelebration(true);
      }
    },
    [student, daily, weekly, items, myDaily, myWeekly, clock.dailyKey, clock.weeklyKey]
  );

  if (!student) {
    if (pendingStudent) {
      if (pins === null) {
        return (
          <div className="p-8 text-center text-teal-600 font-bold text-sm animate-pulse">
            🌊 لحظات...
          </div>
        );
      }
      const hasPin = !!pins[pendingStudent.id];
      return (
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 text-center">
            <button
              onClick={() => {
                setPendingStudent(null);
                setPinInput('');
                setPinConfirm('');
                setPinError('');
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-teal-600 text-xs mb-3"
            >
              <ArrowRight size={14} /> رجوع
            </button>
            <div className="text-3xl mb-1">🔒🦪</div>
            <h2 className="font-extrabold text-teal-700 text-base">{pendingStudent.name}</h2>
            {hasPin ? (
              <>
                <p className="text-slate-400 text-xs mt-1">أدخلي رمزكِ السري (4 أرقام)</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="mt-3 w-full text-center tracking-[0.5em] border border-sky-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 text-lg"
                />
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs mt-1">أنشئي رمزكِ السري الخاص (4 أرقام)</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="رمز 4 أرقام"
                  className="mt-3 w-full text-center tracking-[0.3em] border border-sky-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="تأكيد الرمز"
                  className="mt-2 w-full text-center tracking-[0.3em] border border-sky-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm"
                />
              </>
            )}
            {pinError && <div className="text-rose-500 text-xs mt-2">{pinError}</div>}
            <button
              onClick={submitPin}
              className="mt-4 w-full bg-gradient-to-l from-teal-500 to-cyan-500 text-white font-bold py-2.5 rounded-xl shadow hover:opacity-90 text-sm"
            >
              {hasPin ? 'دخول' : 'حفظ ودخول'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="pb-6">
        <TopBar onExit={onExit} title="اختاري اسمكِ" />
        <div className="p-4 mt-1">
          <div className="grid grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pl-1">
            {STUDENTS.map((s) => {
              const badge = TIER_BADGE[s.tier];
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setPendingStudent(s);
                    setPinInput('');
                    setPinConfirm('');
                    setPinError('');
                  }}
                  className={
                    'bg-white rounded-2xl border p-3 text-center shadow-xs hover:shadow-sm transition-all active:scale-[0.98] ' +
                    (s.group === 'coral' ? 'border-rose-100' : 'border-teal-100')
                  }
                >
                  <div className="text-xl">{GROUPS[s.group].emoji}</div>
                  <div className="font-bold text-slate-700 mt-0.5 text-xs">{s.name}</div>
                  {badge && (
                    <div className="text-[9px] text-amber-500 mt-0.5 font-medium">
                      {badge.emoji} {badge.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !daily || !weekly) {
    return (
      <div className="p-8 text-center text-teal-600 font-bold text-sm animate-pulse">
        🌊 جارِ الغوص لإحضار وردكِ...
      </div>
    );
  }

  const teammates = STUDENTS.filter((s) => s.group === student.group);
  const g = GROUPS[student.group];

  return (
    <div className="pb-8">
      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}
      <TopBar
        onExit={() => {
          setStudent(null);
          setPendingStudent(null);
        }}
        title={`أهلاً، ${student.name} ${g.emoji}`}
        subtitle={DAY_NAMES_BY_INDEX[clock.dayIndex]}
        countdownMs={clock.msRemaining}
      />

      <div className="px-4 mt-3 space-y-3.5">
        <div className="bg-white rounded-2xl shadow-xs border border-sky-100 p-4">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-teal-700 text-sm">وردكِ اليوم</span>
            <span className="text-xs text-slate-400 font-bold">{percent}%</span>
          </div>
          <div className="mt-2">
            <PearlBar percent={percent} big />
          </div>
        </div>

        <GroupRace
          coralPercent={groupAverages.coral}
          pearlPercent={groupAverages.pearl}
          coralBurst={groupBurst.coral}
          pearlBurst={groupBurst.pearl}
        />

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sky-100 p-6 text-center text-slate-400 text-xs">
              <div className="text-3xl mb-1">🐚</div>
              اليوم يوم راحة.. الأصداف نائمة تحت الرمال 💤
            </div>
          ) : (
            items.map((it) => {
              const done = isItemDone(it, myDaily, myWeekly);
              return (
                <button
                  key={it.id}
                  onClick={() => toggleItem(it)}
                  className={
                    'w-full text-right flex items-start gap-2.5 rounded-xl border p-3 transition-all shadow-2xs ' +
                    (done ? 'bg-lime-50/90 border-lime-300' : 'bg-white border-sky-100 hover:border-teal-200')
                  }
                >
                  <span className="text-xl mt-0.5">{it.emoji}</span>
                  <span className="flex-1">
                    <span className={'block font-bold text-xs ' + (done ? 'text-emerald-700 line-through' : 'text-slate-700')}>
                      {it.label} {it.weekly && <span className="text-[9px] text-amber-500 font-normal">(أسبوعي)</span>}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">{it.desc}</span>
                  </span>
                  <span className={'shrink-0 w-5 h-5 rounded-full ring-2 flex items-center justify-center text-white text-[10px] mt-0.5 ' + (done ? 'bg-emerald-400 ring-emerald-400' : 'ring-sky-200')}>
                    {done ? '✓' : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-base">{g.emoji}</span>
            <h3 className={'font-extrabold text-xs ' + g.text}>صيد اللؤلؤ - {g.label}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-sky-100 divide-y divide-sky-50 shadow-2xs overflow-hidden">
            {teammates.map((t) => {
              const tItems = getVisibleItems(clock.dayIndex, t.tier, challengeText);
              const tPercent = percentFor(tItems, daily[t.id], weekly[t.id]);
              return (
                <div key={t.id} className={'flex items-center justify-between px-3 py-2 ' + (t.id === student.id ? 'bg-sky-50/70' : '')}>
                  <span className={'text-xs ' + (t.id === student.id ? 'font-extrabold text-teal-700' : 'text-slate-600')}>
                    {t.name} {t.id === student.id && '(أنتِ)'}
                  </span>
                  <PearlBar percent={tPercent} count={7} />
                </div>
              );
            })}
          </div>
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
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 text-center">
          <button onClick={onExit} className="flex items-center gap-1 text-slate-400 hover:text-teal-600 text-xs mb-3">
            <ArrowRight size={14} /> رجوع
          </button>
          <div className="text-3xl mb-1">🪸👩‍🏫</div>
          <h2 className="font-extrabold text-rose-600 text-base mb-3">من المشرفة؟</h2>
          <div className="space-y-2">
            {SUPERVISORS.map((sup) => (
              <button
                key={sup.id}
                onClick={() => {
                  setChosen(sup);
                  setStep('password');
                  setErr('');
                  setCode('');
                }}
                className="w-full bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl py-2.5 font-bold text-slate-700 text-xs transition"
              >
                {sup.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 text-center">
          <button onClick={() => setStep('choose')} className="flex items-center gap-1 text-slate-400 hover:text-teal-600 text-xs mb-3">
            <ArrowRight size={14} /> رجوع
          </button>
          <div className="text-3xl mb-1">🔒</div>
          <h2 className="font-extrabold text-rose-600 text-base">{chosen.name}</h2>
          <p className="text-slate-400 text-xs mt-1">أدخلي كلمة المرور الخاصّة بكِ</p>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="كلمة المرور"
            className="mt-4 w-full text-center border border-sky-200 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          {err && <div className="text-rose-500 text-xs mt-1.5">{err}</div>}
          <button
            onClick={() => (code === chosen.code ? setStep('dashboard') : setErr('كلمة المرور غير صحيحة'))}
            className="mt-3.5 w-full bg-gradient-to-l from-rose-400 to-pink-500 text-white font-bold py-2.5 rounded-xl shadow hover:opacity-90 text-xs"
          >
            دخول
          </button>
        </div>
      </div>
    );
  }

  return <SupervisorDashboard onExit={onExit} supervisor={chosen} />;
}

function SupervisorDashboard({ onExit, supervisor }) {
  const clock = useCycleClock();
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [pins, setPins] = useState(null);
  const [challengeText, setChallengeText] = useState('');
  const [challengeDraft, setChallengeDraft] = useState('');
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      loadJSON(clock.dailyKey),
      loadJSON(clock.weeklyKey),
      loadChallengeText(clock.challengeKey),
      loadJSON(PINS_KEY),
    ]).then(([d, w, c, p]) => {
      setDaily(d);
      setWeekly(w);
      setChallengeText(c);
      setChallengeDraft(c);
      setPins(p);
      setLoading(false);
    });
  }, [clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const iv = setInterval(() => {
      Promise.all([loadJSON(clock.dailyKey), loadJSON(clock.weeklyKey)]).then(([d, w]) => {
        setDaily(d);
        setWeekly(w);
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [clock.dailyKey, clock.weeklyKey]);

  const resetPin = async (studentId) => {
    const updated = { ...pins };
    delete updated[studentId];
    setPins(updated);
    await saveJSON(PINS_KEY, updated);
  };

  const rows = useMemo(() => {
    if (!daily || !weekly) return [];
    return STUDENTS.map((s) => {
      const items = getVisibleItems(clock.dayIndex, s.tier, challengeText);
      const percent = percentFor(items, daily[s.id], weekly[s.id]);
      return { ...s, percent, completedAt: daily[s.id]?.completedAt || null };
    });
  }, [daily, weekly, clock.dayIndex, challengeText]);

  const { averages: groupAverages, burst: groupBurst } = useGroupRace(clock.dayIndex, challengeText, daily, weekly);

  const leaderboard = useMemo(
    () =>
      rows
        .filter((r) => r.completedAt)
        .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
        .slice(0, 3),
    [rows]
  );

  const filteredRows = rows.filter((r) => {
    if (groupFilter !== 'all' && r.group !== groupFilter) return false;
    if (onlyPending && r.percent === 100) return false;
    if (search && !r.name.includes(search)) return false;
    return true;
  });

  const saveChallenge = async () => {
    setSavingChallenge(true);
    await saveChallengeText(clock.challengeKey, challengeDraft);
    setChallengeText(challengeDraft);
    setSavingChallenge(false);
  };

  if (loading || !daily || !weekly || !pins) {
    return (
      <div className="p-8 text-center text-teal-600 font-bold text-xs animate-pulse">
        🌊 جارِ إحضار لوحة التحكم...
      </div>
    );
  }

  return (
    <div className="pb-8">
      <TopBar
        onExit={onExit}
        title={`أهلاً ${supervisor.name} 🪸`}
        subtitle={DAY_NAMES_BY_INDEX[clock.dayIndex]}
        countdownMs={clock.msRemaining}
      />

      <div className="px-4 mt-3 space-y-3.5">
        <GroupRace
          coralPercent={groupAverages.coral}
          pearlPercent={groupAverages.pearl}
          coralBurst={groupBurst.coral}
          pearlBurst={groupBurst.pearl}
        />

        <div className="bg-white rounded-2xl border border-sky-100 p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-base">🦪</span>
            <h3 className="font-extrabold text-slate-700 text-xs">تحدي الأربعاء الأسبوعي</h3>
          </div>
          <textarea
            value={challengeDraft}
            onChange={(e) => setChallengeDraft(e.target.value)}
            placeholder="اكتبي تفاصيل تحدي المحارة لهذا الأسبوع..."
            rows={2}
            className="w-full border border-sky-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">سيظهر للطالبات يوم الأربعاء</span>
            <button
              onClick={saveChallenge}
              disabled={savingChallenge}
              className="bg-gradient-to-l from-teal-500 to-cyan-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow hover:opacity-90 disabled:opacity-60"
            >
              {savingChallenge ? 'حفظ...' : 'حفظ التحدي'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={16} className="text-amber-400" />
            <h3 className="font-extrabold text-slate-700 text-xs">جدول الأوائل اليوم</h3>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-slate-400 text-xs text-center py-2">لم تُتمّ أي طالبة وردها بعد 🐚</div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between bg-sky-50/60 rounded-xl px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span>{['🥇', '🥈', '🥉'][i]}</span>
                    {r.name}
                    <span className="text-[10px] text-slate-400 font-normal">({GROUPS[r.group].label})</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">اكتمل ✓</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1 bg-sky-50 rounded-xl px-2.5 py-1 flex-1 min-w-[120px]">
              <Search size={13} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحثي..."
                className="bg-transparent outline-none text-xs flex-1"
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="text-xs border border-sky-200 rounded-xl px-2 py-1 bg-white"
            >
              <option value="all">الكل</option>
              <option value="coral">🪸 المرجان</option>
              <option value="pearl">🦪 اللؤلؤ</option>
            </select>
            <button
              onClick={() => setOnlyPending((v) => !v)}
              className={'flex items-center gap-1 text-xs rounded-xl px-2 py-1 border ' + (onlyPending ? 'bg-rose-100 border-rose-300 text-rose-600' : 'border-sky-200 text-slate-500')}
            >
              <Filter size={12} /> لم تكمل
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-sky-50">
            {filteredRows.length === 0 && <div className="text-center text-slate-400 text-xs py-4">لا توجد نتائج</div>}
            {filteredRows.map((r) => {
              const badge = TIER_BADGE[r.tier];
              const hasPin = !!pins[r.id];
              return (
                <div key={r.id} className="flex items-center justify-between py-2 px-0.5">
                  <span className="text-xs text-slate-700 flex items-center gap-1">
                    {GROUPS[r.group].emoji} {r.name}
                    {badge && <span className="text-[9px] text-amber-500">{badge.emoji}</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <PearlBar percent={r.percent} count={5} />
                    <span className="text-[10px] text-slate-400 w-6 text-left">{r.percent}%</span>
                    {hasPin ? (
                      <button onClick={() => resetPin(r.id)} className="text-[9px] text-rose-400 hover:text-rose-600 flex items-center gap-0.5">
                        <Lock size={10} /> إعادة
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-300">بلا رمز</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   التطبيق الرئيسي مع الحاوية المحاكية لشاشة الجوال
--------------------------------------------------------------- */
export default function App() {
  const [role, setRole] = useState(null);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 flex justify-center items-center p-2 sm:p-6" style={{ fontFamily: 'Cairo, Tahoma, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        .ocean-bg { background: linear-gradient(180deg, #eafcff 0%, #f3fcfb 55%, #ffffff 100%); }
        @keyframes popIn { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .pop-in { animation: popIn 0.35s ease-out; }
        @keyframes floatWave { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
        .float-wave { display: inline-block; animation: floatWave 2.2s ease-in-out infinite; }
        @keyframes sparkleAnim { 0% { opacity: 0; transform: scale(0) translateY(0); } 50% { opacity: 1; transform: scale(1.1) translateY(-6px);} 100% { opacity: 0; transform: scale(0.8) translateY(-18px);} }
        .sparkle { animation: sparkleAnim 1.6s ease-in-out infinite; }
        @keyframes swimWiggle { 0%, 100% { transform: rotate(-6deg) translateY(0); } 50% { transform: rotate(6deg) translateY(-3px); } }
        .swim-wiggle { animation: swimWiggle 0.9s ease-in-out infinite; }
        @keyframes bubbleFloatA { 0% { opacity: 0; transform: translateY(0) scale(0.6); } 40% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-14px) scale(1); } }
        .bubble-a { animation: bubbleFloatA 1.8s ease-in-out infinite; }
        @keyframes bubbleFloatB { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 50% { opacity: 0.7; } 100% { opacity: 0; transform: translateY(-20px) scale(0.9); } }
        .bubble-b { animation: bubbleFloatB 2.3s ease-in-out infinite 0.3s; }
        @keyframes splashPop { 0% { opacity: 0; transform: translate(-50%,4px) scale(0.5); } 30% { opacity: 1; transform: translate(-50%,-6px) scale(1.2); } 100% { opacity: 0; transform: translate(-50%,-14px) scale(0.8); } }
        .splash-pop { animation: splashPop 0.9s ease-out; }
      `}</style>

      {/* إطار محاكي شاشة الجوال (App Viewport Window) */}
      <div className="w-full max-w-[390px] min-h-[670px] max-h-[880px] ocean-bg rounded-[38px] shadow-2xl border-4 border-slate-700/80 overflow-y-auto relative flex flex-col justify-between">
        {/* الحافة العلوية لفرام الجوال (Notch Bar) */}
        <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto shrink-0 sticky top-0 z-40 opacity-90 mb-1"></div>

        <div className="flex-1">
          {role === null && <RoleSelect onSelect={setRole} />}
          {role === 'student' && <StudentFlow onExit={() => setRole(null)} />}
          {role === 'supervisor' && <SupervisorFlow onExit={() => setRole(null)} />}
        </div>

        {/* خط الهوم الأسفل في آيفون/جوال */}
        <div className="w-24 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0 opacity-60"></div>
      </div>
    </div>
  );
}
