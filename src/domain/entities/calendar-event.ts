export type CalendarEvent = {
  uid: string
  title: string
  startAt: Date
  endAt: Date
  durationMinutes: number
  calendarName: string
  description?: string | undefined
  location?: string | undefined
}
