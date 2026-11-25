// Data contracts. Types only: this file has no runtime code.

/** @typedef {{ value: number, unit: "mi"|"km" }} Distance  The unit stays as entered. */

/** @typedef {"both"|"km"|"mi"} Units  what the reader wants to see */

/** @typedef {"rest"|"easy"|"steady"|"track"|"gym"|"strength"|"optional"|"long"|"shakeout"|"race"} DayKind */

/**
 * A day in races.json and base_build.json.
 * @typedef {Object} RawDay
 * @property {string} label  "Mon" to "Sun"
 * @property {DayKind} kind
 * @property {string} [distance]  "5 km" or "26.2 mi"
 * @property {string|null} text  null on a track day: track.json supplies the text
 */

/**
 * A day in week_template.json: the normal week, written once.
 * @typedef {Object} TemplateDay
 * @property {string} label  "Mon" to "Sun"
 * @property {DayKind} kind
 * @property {"tue"|"wed"|"track"|"long"} [distanceKey]  column of distances.json
 * @property {string} [gym]  session of gym.json, "A" or "B"
 * @property {string|null} text  null on a track day: track.json supplies the text
 */

/**
 * A day after buildSchedule, for the render modules.
 * @typedef {Object} Day
 * @property {string} label  "Mon" to "Sun"
 * @property {string} date  ISO date
 * @property {DayKind} kind
 * @property {Distance|null} distance  an estimate on a track day
 * @property {string} text
 * @property {{ session: string, name: string, load: string }|null} gym
 */

/** @typedef {"build"|"deload"|"taper"|"race"} WeekType */

/**
 * One line of weeks.json.
 * @typedef {Object} WeekRow
 * @property {number} week  1 to 16
 * @property {string} phase  an id of phases.json
 * @property {WeekType} type  the last week, and only that week, is "race"
 * @property {string} gym  a load of gym.json
 * @property {string|null} longNote  added to the text of the long run
 * @property {string|null} quote  replaces the focus of the phase on the bib
 * @property {Object<string, string>} changes  new text for one day, for example {"Sat": "Rest."}
 */

/**
 * gym.json.
 * @typedef {Object} GymPlan
 * @property {Object<string, { name: string, focus: string,
 *   exercises: { name: string, sets: string, tip: string }[],
 *   image: { file: string, alt: string, credit: { text: string, url: string }|null }|null }>} sessions
 *   image null shows no picture; credit null shows a draft badge next to the image
 * @property {Object<string, Object<string, string>>} loads  load name, then session, then text
 * @property {string[]} rules
 */

/**
 * One line of distances.json.
 * @typedef {Object} WeekDistances
 * @property {number} week  1 to 15
 * @property {"draft"|"confirmed"} status
 * @property {string} tue
 * @property {string} wed
 * @property {string} track  an estimate
 * @property {string} long
 */

/** @typedef {{ from: string, to: string, text: string }} TrackBlock  ISO dates, both included */

/** @typedef {{ id: string, name: string, focus: string }} Phase  one line of phases.json; the styles have a colour for each id */

/** @typedef {{ phase: string, days: RawDay[] }} BaseBuild  phase is an id of phases.json */

/**
 * pace.json.
 * @typedef {Object} PacePlan
 * @property {number} fromMph
 * @property {number} toMph
 * @property {number} stepMph
 * @property {number} startMph  the row that the slider shows first
 * @property {{ label: string, distance: string }[]} distances  the last one is the headline of the slider
 */

/**
 * @typedef {Object} PaceRow
 * @property {number} mph
 * @property {number} kmh
 * @property {number} secondsPerMile
 * @property {number} secondsPerKm
 * @property {number[]} seconds  one for each distance of pace.json
 */

/** @typedef {{ id: string, title: string, path: string }} Page  path from the site root, for example "strength/" */

/**
 * @typedef {Object} Race
 * @property {string} id
 * @property {string} name
 * @property {string} raceDate  ISO date
 * @property {number} baseWeeks
 * @property {"draft"|"confirmed"} status  for race week
 * @property {string|null} raceWeekNote
 * @property {RawDay[]} raceWeekDays
 */

/**
 * @typedef {Object} PlanData
 * @property {Phase[]} phases
 * @property {WeekRow[]} weeks
 * @property {TemplateDay[]} weekTemplate
 * @property {GymPlan} gym
 * @property {WeekDistances[]} distances
 * @property {BaseBuild} baseBuild
 * @property {TrackBlock[]} track
 */

/**
 * The part of the page state that the URL holds.
 * @typedef {Object} PageLocation
 * @property {string|null} raceId
 * @property {string|null} weekKey  null means the current week
 * @property {"week"|"long"} view
 * @property {string|null} date  for tests: shows the page as on this ISO date
 */

/**
 * @typedef {Object} ScheduleWeek
 * @property {string} key  "base-1", "plan-1"
 * @property {"base"|"plan"} kind
 * @property {number} number
 * @property {string} monday  ISO date
 * @property {string} sunday  ISO date
 * @property {WeekContent} content
 */

/**
 * @typedef {Object} WeekContent
 * @property {{ id: string, name: string }} phase
 * @property {string} focus  the quote of the week, or the focus of the phase
 * @property {"base"|WeekType} type
 * @property {"draft"|"confirmed"} status
 * @property {string|null} note  only in race week
 * @property {Day[]} days
 */

export {};
