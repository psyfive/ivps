// src/data/taxonomy/recommendations.js
// ─────────────────────────────────────────────────────────────────────────────
// 증상 기반 스킬 추천 엔진
//
// "어떤 스킬을 어디에 매핑할지 막막함" 문제를 해소하기 위해, 사용자가 구간의
// 문제(증상)를 먼저 고르면 관련 스킬을 Top-N으로 추천한다. 추천 신호는 각 스킬의
// after[].symptom(진단 케이스) 텍스트 + 이름/정의 + 소속 그룹이다.
//
// 순환 import 방지를 위해 index.js가 아닌 카테고리 데이터 파일을 직접 가져온다.
// (index.js가 본 모듈을 재노출하므로 본 모듈은 index.js에 의존하면 안 된다.)
// ─────────────────────────────────────────────────────────────────────────────
import { categoryA } from './categoryA.js';
import { categoryB } from './categoryB.js';
import { categoryC } from './categoryC.js';

const BASE_TAXONOMY = [...categoryA, ...categoryB, ...categoryC];

/**
 * @typedef {Object} SymptomCategory
 * @property {string}   id              안정 식별자 (segment.symptomTags에 저장됨)
 * @property {string}   label           사용자에게 보이는 증상 문구
 * @property {string}   hint            보조 설명(서브타이틀)
 * @property {string[]} keywords        after[].symptom/name/corePrinciple 매칭용 (소문자)
 * @property {string[]} preferredGroups 이 증상의 자연스러운 홈 그룹(SKILL_GROUPS id) — 점수 가산
 */

/**
 * @typedef {Object} SkillRecommendation
 * @property {string}   skillId
 * @property {number}   score            키워드 매칭 + 그룹 보너스
 * @property {string[]} matchedSymptoms  매칭된 after[].symptom 원문(표시/디버그용)
 */

/**
 * 큐레이션된 상위 증상 버킷.
 * 기존 symptomFilter({ label, keywords }) 형태를 일반화한 것.
 * keywords는 모두 소문자로 작성한다(매칭 시 텍스트를 소문자화하므로 영문 키워드 주의).
 * @type {SymptomCategory[]}
 */
export const SYMPTOM_CATEGORIES = [
  {
    id: 'intonation',
    label: '음정이 불안해요',
    hint: '샵/플랫·맥놀이·불협화음',
    keywords: ['음정', '샵', '플랫', 'flat', 'sharp', '맥놀이', '울렁', '불협화음', '피치'],
    preferredGroups: ['A-2', 'A-3'],
  },
  {
    id: 'shifting',
    label: '포지션 이동(쉬프팅)이 흔들려요',
    hint: '도약·슬라이딩·하이 포지션',
    keywords: ['쉬프팅', '시프팅', '시프트', '포지션', '도약', '슬라이', '글리산도', '이동'],
    preferredGroups: ['A-4'],
  },
  {
    id: 'vibrato',
    label: '비브라토가 잘 안 돼요',
    hint: '진폭·진동·떨림',
    keywords: ['비브라토', '진폭', '진동', '떨림'],
    preferredGroups: ['A-5'],
  },
  {
    id: 'harshTone',
    label: '소리가 거칠고 답답해요',
    hint: '쇳소리·긁힘·막힘',
    keywords: ['쇳소리', '거친', '거칠', '긁', '찌그', '막히', '답답', '파열음', '끽'],
    preferredGroups: ['B-2', 'B-6'],
  },
  {
    id: 'weakTone',
    label: '소리가 얇고 빈약해요',
    hint: '심지 없음·표면만 스침',
    keywords: ['빈약', '유령', '표면', 'glassy', '심지', 'core', '얕', '흐릿', '겉돈', '겉도'],
    preferredGroups: ['B-2', 'B-3'],
  },
  {
    id: 'bowChange',
    label: '활·현 바꿈이 거칠어요',
    hint: '보우 체인지·현 교차·악센트',
    keywords: ['활을 바꿀', '활 바꿈', '방향', '현 교차', 'string crossing', '줄 바꿈', '갈아탈', '덜컥', '덜컹', '악센트', '보우 체인지'],
    preferredGroups: ['B-4', 'B-7'],
  },
  {
    id: 'dynamics',
    label: '셈여림(다이내믹)이 안 살아요',
    hint: '크레셴도·포르테·피아노',
    keywords: ['크레셴도', '데크레셴도', '다이내믹', '포르테', 'forte', '피아노', 'piano', '셈여림', '활이 모자', '바나나'],
    preferredGroups: ['C-1', 'B-3'],
  },
  {
    id: 'rhythm',
    label: '박자·리듬이 흔들려요',
    hint: '서두름·절뚝거림·템포',
    keywords: ['박자', '리듬', 'rushing', '서두', '밀려', '절뚝', '빨라', '템포', '메트로놈', '정체기', 'plateau'],
    preferredGroups: ['C-2'],
  },
  {
    id: 'agility',
    label: '빠른 패시지가 안 돼요',
    hint: '손가락 꼬임·속도 정체',
    keywords: ['빠른 패시지', '손가락이 꼬', '속도', '뭉개', '민첩', '정체', 'plateau', '꼬여', '꼬이'],
    preferredGroups: ['A-7', 'A-3'],
  },
  {
    id: 'tension',
    label: '손에 힘이 들어가고 아파요',
    hint: '통증·경련·뻣뻣함',
    keywords: ['통증', '쥐', '경련', '뻐근', '피로', '굳어', '뻣뻣', '경직', '마비'],
    preferredGroups: [],
  },
  {
    id: 'musicality',
    label: '연주가 지루하고 기계적이에요',
    hint: '프레이징·노래·생동감',
    keywords: ['지루', '평면적', '로봇', '기계', '감정', '드라마', '생동감', '노래', '밋밋', '설득력'],
    preferredGroups: ['C-1', 'C-2'],
  },
  {
    id: 'offString',
    label: '튀는 활(스피카토)이 안 돼요',
    hint: '스피카토·바운스·콜레',
    keywords: ['스피카토', '튀', '바운스', 'bounce', '통통', '소티예', '콜레', 'off-string', '오프 스트링'],
    preferredGroups: ['B-8'],
  },
  {
    id: 'doubleStops',
    label: '이중음·화음이 어려워요',
    hint: '더블 스탑·옥타브·트리플 스탑',
    keywords: ['이중음', '더블 스탑', '화음', '옥타브', '트리플', '결합음', '3도', '5도', '6도', '10도'],
    preferredGroups: ['A-2'],
  },
];

const PREFERRED_GROUP_BOOST = 3;
const MAX_KEYWORD_HITS = 5; // 장황한 텍스트가 점수를 독식하지 않도록 키워드별 카운트 상한

function buildSearchText(skill) {
  const afterText = (skill.after ?? []).map(a => a?.symptom ?? '').join(' ');
  return `${skill.name ?? ''} ${skill.corePrinciple ?? ''} ${afterText}`.toLowerCase();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let idx = haystack.indexOf(needle);
  let count = 0;
  while (idx !== -1 && count < MAX_KEYWORD_HITS) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

function getMatchedSymptoms(skill, keywords) {
  return (skill.after ?? [])
    .map(a => a?.symptom ?? '')
    .filter(symptom => {
      const lower = symptom.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });
}

/**
 * 한 스킬이 특정 증상 카테고리에 대해 갖는 적합도 점수.
 * @param {object} skill
 * @param {SymptomCategory} category
 * @returns {number}
 */
function scoreSkill(skill, category) {
  const text = buildSearchText(skill);
  let keywordScore = 0;
  for (const kw of category.keywords) {
    keywordScore += countOccurrences(text, kw);
  }
  const groupBoost = category.preferredGroups.includes(skill.groupId) ? PREFERRED_GROUP_BOOST : 0;
  return keywordScore + groupBoost;
}

/** @returns {SymptomCategory[]} */
export function getSymptomCategories() {
  return SYMPTOM_CATEGORIES;
}

/**
 * 증상 카테고리별 추천 스킬을 점수 내림차순으로 반환.
 * @param {object}   params
 * @param {string}   params.symptomId
 * @param {number}   [params.limit=6]
 * @param {string[]} [params.excludeIds=[]]   이미 매핑된 스킬 등 제외 대상
 * @param {object[]} [params.extraSkills=[]]   커스텀 스킬 등 추가 후보
 * @returns {SkillRecommendation[]}
 */
export function getRecommendedSkills({ symptomId, limit = 6, excludeIds = [], extraSkills = [] } = {}) {
  const category = SYMPTOM_CATEGORIES.find(c => c.id === symptomId);
  if (!category) return [];

  const exclude = new Set(excludeIds);
  const pool = [...BASE_TAXONOMY, ...(Array.isArray(extraSkills) ? extraSkills : [])];

  return pool
    .filter(skill => skill && skill.id && !exclude.has(skill.id))
    .map(skill => ({
      skillId: skill.id,
      score: scoreSkill(skill, category),
      matchedSymptoms: getMatchedSymptoms(skill, category.keywords),
    }))
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId))
    .slice(0, Math.max(0, limit));
}

/**
 * 역방향: 한 스킬이 어떤 증상 카테고리들과 관련되는지(상세 표시용).
 * @param {string}   skillId
 * @param {object[]} [extraSkills=[]]
 * @returns {string[]} symptom category id 목록
 */
export function getSymptomCategoriesForSkill(skillId, extraSkills = []) {
  const pool = [...BASE_TAXONOMY, ...(Array.isArray(extraSkills) ? extraSkills : [])];
  const skill = pool.find(s => s && s.id === skillId);
  if (!skill) return [];
  return SYMPTOM_CATEGORIES
    .filter(category => scoreSkill(skill, category) > 0)
    .map(category => category.id);
}
