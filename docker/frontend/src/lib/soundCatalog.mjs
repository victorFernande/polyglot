import { playAnswerFeedbackSound, unlockAnswerFeedbackSound } from './answerFeedbackSound.mjs'
import { playSessionCompletionFanfare, unlockSessionCompletionFanfare } from './sessionCompletionFanfare.mjs'

export const SOUND_CATALOG = [
  {
    id: 'answer-correct',
    label: 'Acerto',
    cue: 'tin-din / ka-ching',
    description: 'Som agudo, brilhante e ascendente usado quando a resposta está correta.',
    play: () => playAnswerFeedbackSound('correct'),
    unlock: () => unlockAnswerFeedbackSound(),
  },
  {
    id: 'answer-wrong',
    label: 'Erro',
    cue: 'tum-dom / bonk',
    description: 'Som grave, curto e descendente usado quando a resposta precisa de correção.',
    play: () => playAnswerFeedbackSound('wrong'),
    unlock: () => unlockAnswerFeedbackSound(),
  },
  {
    id: 'session-completion',
    label: 'Conclusão de sessão',
    cue: 'ta-ta-ta-taaa',
    description: 'Fanfarra curta de conquista tocada quando uma sessão termina e a próxima começa.',
    play: () => playSessionCompletionFanfare(),
    unlock: () => unlockSessionCompletionFanfare(),
  },
]
