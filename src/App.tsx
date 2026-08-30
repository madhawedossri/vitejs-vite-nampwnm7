```jsx
import { useState, useEffect, useMemo } from 'react';
import { Trophy, X, ArrowRight, Lock, ChevronDown } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
} from 'firebase/firestore';

/* Firebase */
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

/* البيانات */
const NAMES = [
  'سارة', 'لين', 'جنى', 'دانة', 'رهف', 'لمى', 'غلا', 'وعد', 'تالا', 'ريم',
  'جود', 'سديم', 'لجين', 'شهد', 'ملك', 'رغد', 'فرح', 'هيا', 'نوف', 'بشائر',
  'أصايل', 'ريناد', 'لارين', 'عبير', 'مي', 'دلال', 'وطفاء', 'رند', 'أسيل', 'غيداء',
  'جواهر', 'نجود', 'شذى', 'أبرار', 'رهام', 'لوجين', 'سلمى', 'جنان', 'ندى', 'هتون',
  'أماني', 'بيان', 'تولين', 'وجدان', 'ريتاج', 'ليان', 'أريج', 'دانية', 'فاطمة', 'خلود', 'مضاوي',
];

const FORCED_THIRD_TIER_NAMES = ['مضاوي'];

const STUDENTS = NAMES.map((name, i) => {
  let tier = 'new';

  if (FORCED_THIRD_TIER_NAMES.includes(name)) {
    tier = 'third';
  } else if (i % 5 === 4) {
    tier = 'second';
  } else if (i % 7 === 6) {
    tier = 'third';
  }

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
    color: '#e11d48',
    bg: '#fff1f2',
  },
  pearl: {
    label: 'مجموعة اللؤلؤ',
    emoji: '🦪',
    color: '#0f766e',
    bg: '#f0fdfa',
  },
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

const DAY_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const CUTOFF_HOUR = 16;
const CUTOFF_MIN = 30;
const PINS_KEY = 'student-pins-v1';

/* دوال مساعدة */
function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) return `${hours} ساعة`;

  return `${hours} ساعة و ${minutes} دقيقة`;
}

function safeParseJSON(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error('خطأ في قراءة البيانات:', error);
    return fallback;
  }
}

function useCycleClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const cycleStart = new Date(now);
  cycleStart.setHours(CUTOFF_HOUR, CUTOFF_MIN, 0, 0);

  if (now.getTime() < cycleStart.getTime()) {
    cycleStart.setDate(cycleStart.getDate() - 1);
  }

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 1);

  const dateKey = cycleStart.toISOString().slice(0, 10);
  const dayIndex = cycleStart.getDay();
  const currentWeekNum = 1;

  return {
    dayIndex,
    currentWeekNum,
    formattedDate: cycleStart.toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    dailyKey: `wird-daily_${dateKey}`,
    weeklyKey: `wird-weekly_week${currentWeekNum}`,
    challengeKey: `wed-challenge_week${currentWeekNum}`,
    msRemaining: cycleEnd.getTime() - now.getTime(),
  };
}

function getVisibleItems(displayIdx, tier, challengeText) {
  const items = [];

  if ([0, 1, 2, 6].includes(displayIdx)) {
    items.push(
      {
        id: 'listen',
        label: 'سماع المقرر',
        desc: 'سماع النصاب 3 مرات من الشيخ.',
        emoji: '🎧',
        weekly: false,
      },
      {
        id: 'recite',
        label: 'السرد مع رفيقة',
        desc: 'سرده مرتين بدون خطأ أو تنبيه أو لحن.',
        emoji: '🪸',
        weekly: false,
      },
      {
        id: 'repeat',
        label: 'التكرار الذاتي',
        desc: 'التكرار 7 مرات تسجيل صوتي أو بالورقة.',
        emoji: '🫧',
        weekly: false,
      },
      {
        id: 'tafsir',
        label: 'التفسير',
        desc: 'قراءة تفسير النصاب.',
        emoji: '📖',
        weekly: false,
      }
    );

    let reviewDesc = 'مراجعة الورد السابق';

    if (displayIdx === 0) {
      reviewDesc = 'مراجعة مقرر السبت مرتين ذاتياً';
    } else if (displayIdx === 1) {
      reviewDesc = 'مراجعة مقرر السبت والاثنين مرتين ذاتياً';
    } else if (displayIdx === 2) {
      reviewDesc = 'مراجعة مقرر السبت والاثنين والثلاثاء مرتين ذاتياً';
    }

    items.push({
      id: 'review',
      label: 'مراجعة السابق',
      desc: reviewDesc,
      emoji: '🐬',
      weekly: false,
    });
  }

  if (
    (tier === 'second' || tier === 'third') &&
    [0, 1, 2, 3, 6].includes(displayIdx)
  ) {
    items.push({
      id: 'majorReview',
      label: 'المراجعة الكبرى',
      desc: 'خاص بطالبات الدفعة الثانية والدورة الثالثة',
      emoji: '⭐️',
      weekly: false,
    });
  }

  if (tier === 'third' && [0, 1, 2, 3, 4, 6].includes(displayIdx)) {
    items.push({
      id: 'cumulativeReview',
      label: 'المراجعة التراكمية',
      desc: 'خاص بطالبات الدورة الثالثة — تنجز مرة واحدة في الأسبوع',
      emoji: '⛓️✨',
      weekly: true,
    });
  }

  if (displayIdx === 3) {
    items.push({
      id: 'wedChallenge',
      label: 'تحدي الأربعاء',
      desc:
        challengeText?.trim() ||
        'بانتظار المشرفة لكتابة تحدي هذا الأسبوع...',
      emoji: '🦪',
      weekly: false,
    });
  }

  return items;
}

function isItemDone(item, dailySaved, weeklySaved) {
  if (item.weekly) {
    return Boolean(weeklySaved?.[item.id]?.completed);
  }

  return Boolean(dailySaved?.items?.[item.id]);
}

function percentFor(items, dailySaved, weeklySaved) {
  if (!items.length) return 0;

  const completed = items.filter((item) =>
    isItemDone(item, dailySaved, weeklySaved)
  ).length;

  return Math.round((completed / items.length) * 100);
}

function computeGroupAverages(dayIndex, challengeText, daily, weekly) {
  const sums = {
    coral: [],
    pearl: [],
  };

  STUDENTS.forEach((student) => {
    const items = getVisibleItems(
      dayIndex,
      student.tier,
      challengeText
    );

    const percent = percentFor(
      items,
      daily?.[student.id],
      weekly?.[student.id]
    );

    sums[student.group].push(percent);
  });

  const average = (array) =>
    array.length
      ? Math.round(array.reduce((sum, value) => sum + value, 0) / array.length)
      : 0;

  return {
    coral: average(sums.coral),
    pearl: average(sums.pearl),
  };
}

async function loadJSON(key) {
  try {
    const snapshot = await getDoc(doc(db, 'wird', key));

    if (!snapshot.exists()) return {};

    return safeParseJSON(snapshot.data()?.value, {});
  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
    return {};
  }
}

async function saveJSON(key, data) {
  try {
    await setDoc(doc(db, 'wird', key), {
      value: JSON.stringify(data),
    });

    return true;
  } catch (error) {
    console.error('خطأ في حفظ البيانات:', error);
    return false;
  }
}

async function saveChallengeText(key, text) {
  try {
    await setDoc(doc(db, 'wird', key), {
      value: text,
    });

    return true;
  } catch (error) {
    console.error('خطأ في حفظ التحدي:', error);
    return false;
  }
}

function getAvailableDays(dayIndex) {
  const weekOrder = [6, 0, 1, 2, 3, 4, 5];
  const currentPosition = weekOrder.indexOf(dayIndex);

  return weekOrder
    .slice(0, currentPosition + 1)
    .map((idx) => ({
      idx,
      name: DAY_NAMES[idx],
    }));
}

/* المكونات */
function PearlBar({ percent, count = 10, big = false }) {
  const filled = Math.round((percent / 100) * count);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        direction: 'ltr',
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          style={{
            width: big ? '14px' : '10px',
            height: big ? '14px' : '10px',
            borderRadius: '50%',
            display: 'inline-block',
            border: '1px solid #2dd4bf',
            backgroundColor:
              index < filled ? '#2dd4bf' : '#e0f2fe',
          }}
        />
      ))}
    </div>
  );
}

function RaceLane({ emoji, percent, trackTint }) {
  const value = Math.max(0, Math.min(100, percent));

  return (
    <div
      dir="ltr"
      style={{
        position: 'relative',
        height: '48px',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid #e0f2fe',
        backgroundColor: trackTint,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        <span>🚩</span>
        <span>🏆</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `calc(${value}% * 0.78 + 4%)`,
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.7s ease-out',
        }}
      >
        <span style={{ fontSize: '24px' }}>{emoji}</span>
      </div>
    </div>
  );
}

function GroupRace({ coralPercent, pearlPercent, selectedDayIdx }) {
  if (selectedDayIdx === 5) {
    return (
      <div
        style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '20px',
          padding: '16px',
          border: '1px solid #bbf7d0',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '28px' }}>🌸✨</div>
        <h3 style={{ color: '#15803d', fontSize: '15px' }}>
          جمعة مباركة وطيبة
        </h3>
        <p style={{ color: '#166534', fontSize: '12px' }}>
          اللهم صل وسلم على نبينا محمد وعلى آله وصحبه أجمعين 🤍
        </p>
      </div>
    );
  }

  const difference = coralPercent - pearlPercent;

  let banner;

  if (coralPercent === 0 && pearlPercent === 0) {
    banner = '🌊 السباق لم يبدأ بعد.. من ستغطس أولاً؟';
  } else if (difference === 0) {
    banner = '🌊 تعادل مثير بين الفريقين! السباق مشتعل 🔥';
  } else if (difference > 0) {
    banner = `🪸 المرجان تتقدم بفارق ${difference}%!`;
  } else {
    banner = `🦪 اللؤلؤ تتقدم بفارق ${Math.abs(difference)}%!`;
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '16px',
        border: '1px solid #e0f2fe',
        marginBottom: '16px',
      }}
    >
      <h3 style={{ fontSize: '14px', color: '#334155' }}>
        🏊‍♀️ سباق اللآلئ بين الفريقين
      </h3>

      <p style={{ fontSize: '11px', color: '#94a3b8' }}>{banner}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#e11d48',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <span>🪸 المرجان</span>
            <span>{coralPercent}%</span>
          </div>
          <RaceLane
            emoji="🐠"
            percent={coralPercent}
            trackTint="#fff1f2"
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#0f766e',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <span>🦪 اللؤلؤ</span>
            <span>{pearlPercent}%</span>
          </div>
          <RaceLane
            emoji="🐬"
            percent={pearlPercent}
            trackTint="#f0fdfa"
          />
        </div>
      </div>
    </div>
  );
}

function CelebrationModal({ onClose }) {
  useEffect(() => {
    const audio = new Audio(
      'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
    );

    audio.play().catch(() => {});
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,.6)',
        padding: '16px',
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          borderRadius: '28px',
          maxWidth: '320px',
          width: '100%',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ fontSize: '50px' }}>🦪✨</div>
        <h3 style={{ color: '#0f766e' }}>
          أحسنتِ يا لؤلؤة الحلقة! 🌟
        </h3>
        <p style={{ color: '#64748b' }}>أتممتِ وردكِ اليوم بنجاح</p>
        <p style={{ color: '#d97706', fontWeight: 'bold' }}>
          لا تنسين إرسال البطاقة 🍯
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#0d9488',
            color: '#fff',
            border: 'none',
            padding: '12px',
            borderRadius: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          الحمد لله 💙
        </button>
      </div>
    </div>
  );
}

function TopBar({
  onExit,
  title,
  formattedDate,
  countdownMs,
  selectedDayIdx,
  setSelectedDayIdx,
  availableDays,
  weekNum,
  showDropdown = true,
}) {
  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onExit}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 'bold',
          }}
        >
          <ArrowRight size={16} />
          رجوع
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: '800',
              color: '#0f766e',
            }}
          >
            {title}
          </div>

          {showDropdown && availableDays?.length > 0 && (
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                marginTop: '4px',
              }}
            >
              <select
                value={selectedDayIdx}
                onChange={(event) =>
                  setSelectedDayIdx(Number(event.target.value))
                }
                style={{
                  appearance: 'none',
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  border: '1px solid #99f6e4',
                  borderRadius: '12px',
                  padding: '4px 28px 4px 12px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}
              >
                {availableDays.map((day) => (
                  <option key={day.idx} value={day.idx}>
                    {`${weekNum}/4 ${day.name}`}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={14}
                color="#0f766e"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}

          {formattedDate && (
            <div
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                marginTop: '4px',
              }}
            >
              📅 {formattedDate}
            </div>
          )}
        </div>

        <div style={{ width: '40px' }} />
      </div>

      {typeof countdownMs === 'number' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '10px auto 0',
            fontSize: '11px',
            color: '#d97706',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '20px',
            padding: '6px 12px',
            width: 'fit-content',
          }}
        >
          <span>⏳ المتبقي لتسليم اليوم:</span>
          <strong>{formatDuration(countdownMs)}</strong>
        </div>
      )}
    </div>
  );
}

function RoleSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
      <div style={{ fontSize: '40px' }}>🦪🌊🪸</div>

      <h1 style={{ color: '#0f766e' }}>
        ارتقاء - غراس اللؤلؤ
      </h1>

      <p style={{ color: '#64748b', fontSize: '13px' }}>
        من التلقين إلى الإتقان.. نرتقي بالحفظ معاً خطوة بخطوة 🌊✨
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          marginTop: '20px',
        }}
      >
        <button
          onClick={() => onSelect('student')}
          style={roleButtonStyle}
        >
          <div style={{ fontSize: '36px' }}>🦪</div>
          <strong style={{ color: '#0f766e', fontSize: '18px' }}>
            دخول الطالبة
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>
            تابعي وردكِ اليومي
          </div>
        </button>

        <button
          onClick={() => onSelect('supervisor')}
          style={roleButtonStyle}
        >
          <div style={{ fontSize: '36px' }}>🪸</div>
          <strong style={{ color: '#e11d48', fontSize: '18px' }}>
            المشرفات
          </strong>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>
            لوحة تحكم خاصة بالمشرفات
          </div>
        </button>
      </div>
    </div>
  );
}

const roleButtonStyle = {
  backgroundColor: '#fff',
  borderRadius: '20px',
  border: '1px solid #e0f2fe',
  padding: '20px',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,.05)',
  cursor: 'pointer',
};

/* دخول الطالبات */
function StudentFlow({ onExit }) {
  const clock = useCycleClock();

  const [pins, setPins] = useState({});
  const [pendingStudent, setPendingStudent] = useState(null);
  const [student, setStudent] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [daily, setDaily] = useState({});
  const [weekly, setWeekly] = useState({});
  const [challengeText, setChallengeText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(clock.dayIndex);

  const availableDays = useMemo(
    () => getAvailableDays(clock.dayIndex),
    [clock.dayIndex]
  );

  useEffect(() => {
    loadJSON(PINS_KEY).then((data) => setPins(data || {}));

    const savedStudentId = localStorage.getItem('saved_student_id');

    if (savedStudentId) {
      const found = STUDENTS.find(
        (item) => item.id === savedStudentId
      );

      if (found) setStudent(found);
    }
  }, []);

  useEffect(() => {
    if (!student) return undefined;

    const dailyUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.dailyKey),
      (snapshot) => {
        setDaily(
          safeParseJSON(snapshot.data()?.value, {})
        );
      }
    );

    const weeklyUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.weeklyKey),
      (snapshot) => {
        setWeekly(
          safeParseJSON(snapshot.data()?.value, {})
        );
      }
    );

    const challengeUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.challengeKey),
      (snapshot) => {
        setChallengeText(snapshot.data()?.value || '');
      }
    );

    return () => {
      dailyUnsubscribe();
      weeklyUnsubscribe();
      challengeUnsubscribe();
    };
  }, [student, clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  const submitPin = async () => {
    if (!pendingStudent) return;

    const existingPin = pins?.[pendingStudent.id];

    if (existingPin) {
      if (pinInput === existingPin) {
        setStudent(pendingStudent);
        setPinError('');
        localStorage.setItem(
          'saved_student_id',
          pendingStudent.id
        );
      } else {
        setPinError('الرمز غير صحيح، حاولي مجدداً');
      }

      return;
    }

    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('الرمز يجب أن يكون 4 أرقام');
      return;
    }

    if (pinInput !== pinConfirm) {
      setPinError('الرمزان غير متطابقين');
      return;
    }

    const updatedPins = {
      ...pins,
      [pendingStudent.id]: pinInput,
    };

    setPins(updatedPins);
    await saveJSON(PINS_KEY, updatedPins);
    setStudent(pendingStudent);
    setPinError('');

    localStorage.setItem(
      'saved_student_id',
      pendingStudent.id
    );
  };

  const items = student
    ? getVisibleItems(selectedDayIdx, student.tier, challengeText)
    : [];

  const myDaily = student ? daily?.[student.id] : null;
  const myWeekly = student ? weekly?.[student.id] : null;

  const percent = useMemo(
    () => percentFor(items, myDaily, myWeekly),
    [items, myDaily, myWeekly]
  );

  const groupAverages = useMemo(
    () =>
      computeGroupAverages(
        selectedDayIdx,
        challengeText,
        daily,
        weekly
      ),
    [selectedDayIdx, challengeText, daily, weekly]
  );

  const toggleItem = async (item) => {
    if (!student) return;

    if (item.weekly) {
      const currentEntry = weekly?.[student.id] || {};
      const currentItem = currentEntry[item.id] || {
        completed: false,
        completedAt: null,
      };

      const completed = !currentItem.completed;

      const updatedWeekly = {
        ...weekly,
        [student.id]: {
          ...currentEntry,
          [item.id]: {
            completed,
            completedAt: completed
              ? new Date().toISOString()
              : null,
          },
        },
      };

      setWeekly(updatedWeekly);
      await saveJSON(clock.weeklyKey, updatedWeekly);

      if (
        percentFor(items, myDaily, updatedWeekly[student.id]) === 100
      ) {
        setShowCelebration(true);
      }

      return;
    }

    const current = daily?.[student.id] || {
      items: {},
      completedAt: null,
    };

    const newItems = {
      ...current.items,
      [item.id]: !current.items?.[item.id],
    };

    const newPercent = percentFor(
      items,
      { items: newItems },
      myWeekly
    );

    const updatedDaily = {
      ...daily,
      [student.id]: {
        items: newItems,
        completedAt:
          newPercent === 100
            ? current.completedAt || new Date().toISOString()
            : null,
      },
    };

    setDaily(updatedDaily);
    await saveJSON(clock.dailyKey, updatedDaily);

    if (newPercent === 100 && !current.completedAt) {
      setShowCelebration(true);
    }
  };

  if (!student) {
    if (pendingStudent) {
      const hasPin = Boolean(pins?.[pendingStudent.id]);

      return (
        <div>
          <button
            onClick={() => {
              setPendingStudent(null);
              setPinInput('');
              setPinConfirm('');
              setPinError('');
            }}
            style={backButtonStyle}
          >
            <ArrowRight size={16} />
            رجوع
          </button>

          <div style={cardStyle}>
            <div style={{ fontSize: '36px' }}>🔒🦪</div>

            <h2 style={{ color: '#0f766e' }}>
              {pendingStudent.name}
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              {hasPin
                ? 'أدخلي رمزكِ السري 4 أرقام'
                : 'أنشئي رمزكِ السري الخاص 4 أرقام'}
            </p>

            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(event) => {
                setPinInput(
                  event.target.value.replace(/\D/g, '')
                );
                setPinError('');
              }}
              placeholder="••••"
              style={inputStyle}
            />

            {!hasPin && (
              <input
                type="password"
                maxLength={4}
                value={pinConfirm}
                onChange={(event) => {
                  setPinConfirm(
                    event.target.value.replace(/\D/g, '')
                  );
                  setPinError('');
                }}
                placeholder="تأكيد الرمز"
                style={inputStyle}
              />
            )}

            {pinError && (
              <div
                style={{
                  color: '#ef4444',
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                {pinError}
              </div>
            )}

            <button
              onClick={submitPin}
              style={primaryButtonStyle}
            >
              {hasPin ? 'دخول' : 'حفظ ودخول'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <TopBar
          onExit={onExit}
          title="اختاري اسمكِ"
          showDropdown={false}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            maxHeight: '480px',
            overflowY: 'auto',
          }}
        >
          {STUDENTS.map((item) => {
            const badge = TIER_BADGE[item.tier];

            return (
              <button
                key={item.id}
                onClick={() => {
                  const savedPin = pins?.[item.id];

                  if (
                    savedPin &&
                    localStorage.getItem('saved_student_id') === item.id
                  ) {
                    setStudent(item);
                  } else {
                    setPendingStudent(item);
                    setPinInput('');
                    setPinConfirm('');
                    setPinError('');
                  }
                }}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: `1px solid ${
                    item.group === 'coral'
                      ? '#ffe4e6'
                      : '#ccfbf1'
                  }`,
                  padding: '12px 8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '20px' }}>
                  {GROUPS[item.group].emoji}
                </div>

                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#334155',
                    fontSize: '13px',
                  }}
                >
                  {item.name}
                </div>

                {badge && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#f59e0b',
                    }}
                  >
                    {badge.emoji} {badge.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const teammates = STUDENTS.filter(
    (item) => item.group === student.group
  );

  const group = GROUPS[student.group];

  const sortedTeammates = [...teammates]
    .map((item) => {
      const teammateItems = getVisibleItems(
        selectedDayIdx,
        item.tier,
        challengeText
      );

      return {
        ...item,
        percent: percentFor(
          teammateItems,
          daily?.[item.id],
          weekly?.[item.id]
        ),
        completedAt: daily?.[item.id]?.completedAt || null,
      };
    })
    .sort((a, b) => {
      if (a.percent === 100 && b.percent !== 100) return -1;
      if (a.percent !== 100 && b.percent === 100) return 1;

      if (a.percent === 100 && b.percent === 100) {
        return (
          new Date(a.completedAt) - new Date(b.completedAt)
        );
      }

      return 0;
    });

  const completedTeammates = sortedTeammates.filter(
    (item) => item.percent === 100
  );

  return (
    <div>
      {showCelebration && (
        <CelebrationModal
          onClose={() => setShowCelebration(false)}
        />
      )}

      <TopBar
        onExit={() => {
          setStudent(null);
          setPendingStudent(null);
          localStorage.removeItem('saved_student_id');
        }}
        title={`أهلاً، ${student.name} ${group.emoji}`}
        formattedDate={clock.formattedDate}
        countdownMs={clock.msRemaining}
        selectedDayIdx={selectedDayIdx}
        setSelectedDayIdx={setSelectedDayIdx}
        availableDays={availableDays}
        weekNum={clock.currentWeekNum}
      />

      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <strong style={{ color: '#0f766e' }}>
            ورد يوم {DAY_NAMES[selectedDayIdx]}
          </strong>
          <strong style={{ color: '#64748b' }}>
            {percent}%
          </strong>
        </div>

        <PearlBar percent={percent} big />
      </div>

      <GroupRace
        coralPercent={groupAverages.coral}
        pearlPercent={groupAverages.pearl}
        selectedDayIdx={selectedDayIdx}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        {items.map((item) => {
          const done = isItemDone(item, myDaily, myWeekly);

          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item)}
              style={{
                width: '100%',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                borderRadius: '16px',
                border: `1px solid ${
                  done ? '#86efac' : '#e0f2fe'
                }`,
                backgroundColor: done ? '#f0fdf4' : '#fff',
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {item.emoji}
              </span>

              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    fontWeight: 'bold',
                    color: done ? '#15803d' : '#334155',
                    textDecoration: done
                      ? 'line-through'
                      : 'none',
                  }}
                >
                  {item.label}
                </span>

                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '2px',
                  }}
                >
                  {item.desc}
                </span>
              </span>

              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${
                    done ? '#22c55e' : '#cbd5e1'
                  }`,
                  backgroundColor: done
                    ? '#22c55e'
                    : 'transparent',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <h3 style={{ color: group.color }}>
        صيد اللؤلؤ - {group.label}
      </h3>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          border: '1px solid #e0f2fe',
          overflow: 'hidden',
        }}
      >
        {sortedTeammates.map((item) => {
          const isDone = item.percent === 100;
          const rank = completedTeammates.findIndex(
            (completed) => completed.id === item.id
          );

          let badge = null;

          if (isDone) {
            badge =
              rank === 0
                ? '🥇 الأولى'
                : rank === 1
                ? '🥈 الثانية'
                : rank === 2
                ? '🥉 الثالثة'
                : 'منجزة ✓';
          }

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor:
                  item.id === student.id
                    ? '#f0fdfa'
                    : isDone
                    ? '#f0fdf4'
                    : 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: isDone
                    ? '#15803d'
                    : item.id === student.id
                    ? '#0f766e'
                    : '#475569',
                  fontWeight:
                    item.id === student.id || isDone
                      ? '800'
                      : 'normal',
                }}
              >
                {item.name} {item.id === student.id && '(أنتِ)'}
                {badge && (
                  <span
                    style={{
                      fontSize: '10px',
                      marginRight: '6px',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </span>

              <PearlBar percent={item.percent} count={7} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* دخول المشرفات */
function SupervisorFlow({ onExit }) {
  const [step, setStep] = useState('choose');
  const [chosen, setChosen] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (step === 'choose') {
    return (
      <div style={cardStyle}>
        <button onClick={onExit} style={backButtonStyle}>
          <ArrowRight size={16} />
          رجوع
        </button>

        <div style={{ fontSize: '36px' }}>🪸👩‍🏫</div>

        <h2 style={{ color: '#e11d48' }}>
          من المشرفة؟
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {SUPERVISORS.map((supervisor) => (
            <button
              key={supervisor.id}
              onClick={() => {
                setChosen(supervisor);
                setStep('password');
                setCode('');
                setError('');
              }}
              style={secondaryButtonStyle}
            >
              {supervisor.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div style={cardStyle}>
        <button
          onClick={() => setStep('choose')}
          style={backButtonStyle}
        >
          <ArrowRight size={16} />
          رجوع
        </button>

        <div style={{ fontSize: '36px' }}>🔒</div>

        <h2 style={{ color: '#e11d48' }}>
          {chosen?.name}
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          أدخلي كلمة المرور الخاصة بكِ
        </p>

        <input
          type="password"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError('');
          }}
          placeholder="كلمة المرور"
          style={inputStyle}
        />

        {error && (
          <div
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '10px',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={() => {
            if (code === chosen?.code) {
              setStep('dashboard');
            } else {
              setError('كلمة المرور غير صحيحة');
            }
          }}
          style={{
            ...primaryButtonStyle,
            backgroundColor: '#e11d48',
          }}
        >
          دخول
        </button>
      </div>
    );
  }

  return (
    <SupervisorDashboard
      onExit={onExit}
      supervisor={chosen}
    />
  );
}

/* لوحة المشرفة */
function SupervisorDashboard({ onExit, supervisor }) {
  const clock = useCycleClock();

  const [daily, setDaily] = useState({});
  const [weekly, setWeekly] = useState({});
  const [pins, setPins] = useState({});
  const [challengeText, setChallengeText] = useState('');
  const [challengeDraft, setChallengeDraft] = useState('');
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDayIdx, setSelectedDayIdx] = useState(
    clock.dayIndex
  );

  const availableDays = useMemo(
    () => getAvailableDays(clock.dayIndex),
    [clock.dayIndex]
  );

  useEffect(() => {
    const dailyUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.dailyKey),
      (snapshot) => {
        setDaily(
          safeParseJSON(snapshot.data()?.value, {})
        );
      }
    );

    const weeklyUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.weeklyKey),
      (snapshot) => {
        setWeekly(
          safeParseJSON(snapshot.data()?.value, {})
        );
      }
    );

    const challengeUnsubscribe = onSnapshot(
      doc(db, 'wird', clock.challengeKey),
      (snapshot) => {
        const value = snapshot.data()?.value || '';
        setChallengeText(value);
        setChallengeDraft(value);
      }
    );

    loadJSON(PINS_KEY).then((data) => setPins(data || {}));

    return () => {
      dailyUnsubscribe();
      weeklyUnsubscribe();
      challengeUnsubscribe();
    };
  }, [clock.dailyKey, clock.weeklyKey, clock.challengeKey]);

  const resetPin = async (studentId) => {
    const updatedPins = { ...pins };
    delete updatedPins[studentId];

    setPins(updatedPins);
    await saveJSON(PINS_KEY, updatedPins);
  };

  const saveChallenge = async () => {
    setSavingChallenge(true);

    const saved = await saveChallengeText(
      clock.challengeKey,
      challengeDraft
    );

    if (saved) setChallengeText(challengeDraft);

    setSavingChallenge(false);
  };

  const rows = useMemo(
    () =>
      STUDENTS.map((student) => {
        const items = getVisibleItems(
          selectedDayIdx,
          student.tier,
          challengeText
        );

        return {
          ...student,
          percent: percentFor(
            items,
            daily?.[student.id],
            weekly?.[student.id]
          ),
          completedAt:
            daily?.[student.id]?.completedAt || null,
        };
      }),
    [selectedDayIdx, challengeText, daily, weekly]
  );

  const groupAverages = useMemo(
    () =>
      computeGroupAverages(
        selectedDayIdx,
        challengeText,
        daily,
        weekly
      ),
    [selectedDayIdx, challengeText, daily, weekly]
  );

  const leaderboard = useMemo(
    () =>
      rows
        .filter((row) => row.completedAt)
        .sort(
          (a, b) =>
            new Date(a.completedAt) - new Date(b.completedAt)
        )
        .slice(0, 3),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        if (a.percent === 100 && b.percent !== 100) return -1;
        if (a.percent !== 100 && b.percent === 100) return 1;

        if (a.percent === 100 && b.percent === 100) {
          return (
            new Date(a.completedAt) - new Date(b.completedAt)
          );
        }

        return 0;
      })
      .filter((row) => {
        if (
          groupFilter !== 'all' &&
          groupFilter !== 'third' &&
          row.group !== groupFilter
        ) {
          return false;
        }

        if (groupFilter === 'third' && row.tier !== 'third') {
          return false;
        }

        if (search && !row.name.includes(search)) {
          return false;
        }

        return true;
      });
  }, [rows, groupFilter, search]);

  return (
    <div>
      <TopBar
        onExit={onExit}
        title={`أهلاً ${supervisor?.name} 🪸`}
        formattedDate={clock.formattedDate}
        countdownMs={clock.msRemaining}
        selectedDayIdx={selectedDayIdx}
        setSelectedDayIdx={setSelectedDayIdx}
        availableDays={availableDays}
        weekNum={clock.currentWeekNum}
      />

      <GroupRace
        coralPercent={groupAverages.coral}
        pearlPercent={groupAverages.pearl}
        selectedDayIdx={selectedDayIdx}
      />

      <div style={cardStyle}>
        <h3 style={{ color: '#334155', fontSize: '13px' }}>
          ✍️ كتابة تحدي الأربعاء الأسبوعي
        </h3>

        <textarea
          value={challengeDraft}
          onChange={(event) =>
            setChallengeDraft(event.target.value)
          }
          placeholder="اكتبي التحدي هنا..."
          rows={3}
          style={{
            ...inputStyle,
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={saveChallenge}
          disabled={savingChallenge}
          style={primaryButtonStyle}
        >
          {savingChallenge ? 'جار الحفظ...' : 'حفظ التحدي'}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#334155', fontSize: '13px' }}>
          <Trophy size={16} color="#f59e0b" /> الأوائل المكتملات اليوم
        </h3>

        {leaderboard.length === 0 ? (
          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            لم تكمل أي طالبة الورد بعد اليوم 🐚
          </div>
        ) : (
          leaderboard.map((row, index) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                backgroundColor: '#f0fdfa',
                borderRadius: '10px',
                marginBottom: '6px',
                fontSize: '12px',
              }}
            >
              <span>
                {['🥇', '🥈', '🥉'][index]} {row.name}
              </span>
              <strong style={{ color: '#16a34a' }}>
                اكتمل ✓
              </strong>
            </div>
          ))
        )}
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '10px',
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحثي عن طالبة..."
            style={{ ...inputStyle, marginBottom: 0 }}
          />

          <select
            value={groupFilter}
            onChange={(event) =>
              setGroupFilter(event.target.value)
            }
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '6px',
              fontSize: '11px',
              backgroundColor: '#fff',
            }}
          >
            <option value="all">الكل</option>
            <option value="coral">🪸 المرجان</option>
            <option value="pearl">🦪 اللؤلؤ</option>
            <option value="third">⛓️ التراكمية</option>
          </select>
        </div>

        <div
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {filteredRows.map((row) => {
            const isDone = row.percent === 100;
            const rank = leaderboard.findIndex(
              (item) => item.id === row.id
            );

            let badge = null;

            if (isDone) {
              badge =
                rank === 0
                  ? '🥇 الأولى'
                  : rank === 1
                  ? '🥈 الثانية'
                  : rank === 2
                  ? '🥉 الثالثة'
                  : 'منجزة ✓';
            }

            return (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9',
                  padding: '8px 0',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: isDone ? '#15803d' : '#334155',
                    fontWeight: isDone ? 'bold' : 'normal',
                  }}
                >
                  {GROUPS[row.group].emoji} {row.name}{' '}
                  {badge && (
                    <small style={{ marginRight: '6px' }}>
                      {badge}
                    </small>
                  )}
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <PearlBar percent={row.percent} count={5} />

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      width: '30px',
                    }}
                  >
                    {row.percent}%
                  </span>

                  {pins?.[row.id] && (
                    <button
                      onClick={() => resetPin(row.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f43f5e',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="حذف رمز الطالبة"
                    >
                      <Lock size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* التنسيقات */
const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '20px',
  padding: '16px',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,.05)',
};

const inputStyle = {
  width: '100%',
  textAlign: 'center',
  padding: '10px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  marginBottom: '10px',
};

const primaryButtonStyle = {
  width: '100%',
  backgroundColor: '#0d9488',
  color: '#fff',
  border: 'none',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px',
  fontWeight: 'bold',
  color: '#334155',
  cursor: 'pointer',
};

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginBottom: '12px',
  fontWeight: 'bold',
};

/* التطبيق الرئيسي */
export default function App() {
  const [role, setRole] = useState(null);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#eafcff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '16px',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

        * {
          box-sizing: border-box;
        }

        button,
        input,
        textarea,
        select {
          font-family: inherit;
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          minHeight: '600px',
          backgroundColor: '#f8fafc',
          borderRadius: '32px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,.1)',
          border: '4px solid #fff',
        }}
      >
        {role === null && (
          <RoleSelect onSelect={setRole} />
        )}

        {role === 'student' && (
          <StudentFlow onExit={() => setRole(null)} />
        )}

        {role === 'supervisor' && (
          <SupervisorFlow onExit={() => setRole(null)} />
        )}
      </div>
    </div>
  );
}
```
