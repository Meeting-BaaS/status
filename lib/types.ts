export type UserReportedErrorMessage = {
  created_at: string
  author: string
  note: string
}

export type UserReportedError = {
  status: "open" | "closed" | "in progress"
  messages: UserReportedErrorMessage[]
}

export type BotStatusResponse = {
  category: string
  color: string
  details: string | null
  icon: string
  sort_priority: number
  type: string
  value: string
}

export type BotData = {
  id: number
  account_id: number
  meeting_url: string
  created_at: string
  session_id: string | null
  reserved: boolean
  errors: string | null
  ended_at: string | null
  mp4_s3_path: string
  uuid: string
  bot_param_id: number
  event_id: number | null
  scheduled_bot_id: number | null
  diarization_v2: boolean
  transcription_fails: number | null
  diarization_fails: number | null
  user_reported_error: UserReportedError
  params: {
    bot_name: string
    bot_image: string | null
    speech_to_text_provider: "Default" | "Gladia" | "Runpod" | null
    enter_message: string | null
    recording_mode: "speaker_view" | "gallery_view" | "audio_only" | null
    speech_to_text_api_key: string | null
    streaming_input: string | null
    streaming_output: string | null
    waiting_room_timeout: number | null
    noone_joined_timeout: number | null
    deduplication_key: string | null
    extra: Record<string, unknown>
    webhook_url: string
    streaming_audio_frequency: "16khz" | "24khz" | null
    zoom_sdk_id: string | null
    zoom_sdk_pwd: string | null
  }
  duration: number
  status: BotStatusResponse
}

export type BotPaginated = {
  has_more: boolean
  bots: BotData[]
}
