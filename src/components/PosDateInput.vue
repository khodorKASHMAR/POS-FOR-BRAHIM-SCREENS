<template>
  <div ref="rootRef" class="pos-date-input">
    <div
      ref="inputWrapRef"
      class="pos-date-field"
      :class="{ 'pos-date-field--open': showCalendar }"
      @click.stop="openCalendar"
    >
      <input
        type="text"
        class="pos-date-display"
        :value="displayValue"
        :placeholder="placeholder"
        readonly
      />
      <v-icon size="18" class="pos-date-icon">mdi-calendar</v-icon>
    </div>

    <Teleport to="body">
      <div
        v-if="showCalendar"
        ref="popupRef"
        class="pos-calendar-popup"
        :style="popupStyle"
        @mousedown.stop
      >
        <div class="pos-calendar-header">
          <button type="button" class="pos-calendar-nav" @click="previousMonth">
            <v-icon size="20">{{ chevronPrev }}</v-icon>
          </button>

          <button type="button" class="pos-calendar-month-year" @click="toggleMonthView">
            {{ headerLabel }}
          </button>

          <button type="button" class="pos-calendar-nav" @click="nextMonth">
            <v-icon size="20">{{ chevronNext }}</v-icon>
          </button>
        </div>

        <div v-if="!monthView" class="pos-calendar-days-wrap">
          <div class="pos-calendar-weekdays">
            <div v-for="day in weekdays" :key="day" class="pos-calendar-weekday">{{ day }}</div>
          </div>
          <div class="pos-calendar-days">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="pos-calendar-day"
              :class="{
                'is-other-month': day.otherMonth,
                'is-today': day.isToday,
                'is-selected': day.isSelected
              }"
              :disabled="day.otherMonth"
              @click="selectDate(day)"
            >
              {{ day.date }}
            </button>
          </div>
        </div>

        <div v-else class="pos-calendar-months">
          <button
            v-for="(month, index) in monthNames"
            :key="index"
            type="button"
            class="pos-calendar-month"
            :class="{ 'is-selected': index === currentMonth }"
            @click="selectMonth(index)"
          >
            {{ month }}
          </button>
        </div>

        <div class="pos-calendar-footer">
          <button type="button" class="pos-calendar-today" @click="selectToday">
            {{ todayLabel }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useState } from '../store/state'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const state = useState()
const rootRef = ref(null)
const inputWrapRef = ref(null)
const popupRef = ref(null)
const showCalendar = ref(false)
const monthView = ref(false)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())
const popupPosition = ref({ top: 0, left: 0 })

const isAr = computed(() => state.lang === 'ar')
const chevronPrev = computed(() => (isAr.value ? 'mdi-chevron-right' : 'mdi-chevron-left'))
const chevronNext = computed(() => (isAr.value ? 'mdi-chevron-left' : 'mdi-chevron-right'))
const todayLabel = computed(() => (isAr.value ? 'اليوم' : 'Today'))

const monthNames = computed(() =>
  isAr.value
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
)

const weekdays = computed(() =>
  isAr.value
    ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
)

const popupStyle = computed(() => ({
  position: 'fixed',
  top: `${popupPosition.value.top}px`,
  left: `${popupPosition.value.left}px`,
  zIndex: 9999
}))

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-').map(Number)
  if (!y || !m || !d) return props.modelValue
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(isAr.value ? 'ar-LB' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
})

const headerLabel = computed(() => {
  if (monthView.value) return String(currentYear.value)
  return `${monthNames.value[currentMonth.value]} ${currentYear.value}`
})

const calendarDays = computed(() => {
  const first = new Date(currentYear.value, currentMonth.value, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  const daysInPrev = new Date(currentYear.value, currentMonth.value, 0).getDate()
  const cells = []

  for (let i = startDay - 1; i >= 0; i--) {
    cells.push(makeDayCell(daysInPrev - i, currentMonth.value - 1, currentYear.value, true))
  }
  for (let date = 1; date <= daysInMonth; date++) {
    cells.push(makeDayCell(date, currentMonth.value, currentYear.value, false))
  }
  let trailing = 1
  while (cells.length % 7 !== 0) {
    cells.push(makeDayCell(trailing++, currentMonth.value + 1, currentYear.value, true))
  }
  return cells
})

function makeDayCell(date, month, year, otherMonth) {
  let y = year
  let m = month
  if (m < 0) {
    m = 11
    y -= 1
  } else if (m > 11) {
    m = 0
    y += 1
  }
  const fullDate = new Date(y, m, date)
  const iso = toIso(fullDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  fullDate.setHours(0, 0, 0, 0)
  return {
    key: `${y}-${m}-${date}-${otherMonth}`,
    date,
    otherMonth,
    fullDate,
    isToday: fullDate.getTime() === now.getTime(),
    isSelected: props.modelValue === iso
  }
}

function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function syncFromModel() {
  if (!props.modelValue) return
  const [y, m] = props.modelValue.split('-').map(Number)
  if (y && m) {
    currentYear.value = y
    currentMonth.value = m - 1
  }
}

function calculatePopupPosition() {
  if (!inputWrapRef.value) return
  const rect = inputWrapRef.value.getBoundingClientRect()
  const popupHeight = 320
  const popupWidth = 280
  let top = rect.bottom + 4
  let left = rect.left
  if (top + popupHeight > window.innerHeight) top = Math.max(8, rect.top - popupHeight - 4)
  if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - 8
  if (left < 8) left = 8
  popupPosition.value = { top, left }
}

function openCalendar() {
  if (showCalendar.value) return
  showCalendar.value = true
  monthView.value = false
  syncFromModel()
  nextTick(() => {
    calculatePopupPosition()
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('scroll', calculatePopupPosition, true)
    window.addEventListener('resize', calculatePopupPosition)
  })
}

function closeCalendar() {
  showCalendar.value = false
  monthView.value = false
  removeListeners()
}

function removeListeners() {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('scroll', calculatePopupPosition, true)
  window.removeEventListener('resize', calculatePopupPosition)
}

function onClickOutside(e) {
  if (rootRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  closeCalendar()
}

function previousMonth() {
  if (monthView.value) {
    currentYear.value -= 1
    return
  }
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
}

function nextMonth() {
  if (monthView.value) {
    currentYear.value += 1
    return
  }
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
}

function toggleMonthView() {
  monthView.value = !monthView.value
}

function selectMonth(index) {
  currentMonth.value = index
  monthView.value = false
}

function selectDate(day) {
  if (day.otherMonth) return
  emit('update:modelValue', toIso(day.fullDate))
  closeCalendar()
}

function selectToday() {
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth()
  emit('update:modelValue', toIso(now))
  closeCalendar()
}

watch(() => props.modelValue, syncFromModel)

onBeforeUnmount(removeListeners)
</script>

<style scoped>
.pos-date-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 40px;
  padding: 0 0.65rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, rgba(34, 147, 161, 0.55), rgba(50, 216, 238, 0.55)) border-box;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.pos-date-field--open,
.pos-date-field:hover {
  box-shadow: 0 0 0 3px rgba(25, 119, 131, 0.14);
}

.pos-date-display {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 0;
}

.pos-date-display::placeholder {
  color: rgba(0, 0, 0, 0.38);
  font-weight: 500;
}

.pos-date-icon {
  color: #197783;
  flex-shrink: 0;
}
</style>

<style>
.pos-calendar-popup {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  padding: 0.75rem;
  min-width: 280px;
  width: 280px;
}

.pos-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.pos-calendar-month-year {
  font-weight: 600;
  font-size: 0.875rem;
  color: #334155;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
  background: none;
  transition: all 0.2s;
}

.pos-calendar-month-year:hover {
  background-color: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.pos-calendar-nav {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #475569;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-calendar-nav:hover {
  color: #197783;
  background-color: rgba(25, 119, 131, 0.1);
}

.pos-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.25rem;
}

.pos-calendar-weekday {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #64748b;
}

.pos-calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.5rem;
}

.pos-calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  border-radius: 50%;
  cursor: pointer;
  color: #334155;
  min-height: 30px;
  background: none;
  border: none;
}

.pos-calendar-day:hover:not(:disabled):not(.is-other-month) {
  background-color: rgba(25, 119, 131, 0.1);
}

.pos-calendar-day.is-other-month {
  color: #94a3b8;
  opacity: 0.4;
}

.pos-calendar-day.is-today {
  border: 2px solid #197783;
  color: #197783;
  font-weight: 600;
}

.pos-calendar-day.is-selected {
  background-color: #197783;
  color: #fff;
  font-weight: 600;
}

.pos-calendar-months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.pos-calendar-month {
  padding: 0.5rem 0.25rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #334155;
  background: none;
  text-align: center;
}

.pos-calendar-month:hover {
  background-color: rgba(25, 119, 131, 0.1);
  color: #197783;
}

.pos-calendar-month.is-selected {
  background-color: #197783;
  color: #fff;
  font-weight: 600;
}

.pos-calendar-footer {
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.pos-calendar-today {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  background: linear-gradient(135deg, #197783, #32d8ee);
  color: #fff;
}
</style>
