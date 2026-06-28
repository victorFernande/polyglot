import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./src/pages/Exercises.jsx', import.meta.url), 'utf8')
const api = readFileSync(new URL('./src/lib/api.js', import.meta.url), 'utf8')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(source.includes("../lib/api"), 'Exercises.jsx deve consumir o cliente API compartilhado')
assert(!source.includes('const EXERCISES ='), 'Exercises.jsx não deve manter exercícios estáticos locais')
assert(source.includes('loadExerciseLessons'), 'Exercises.jsx deve carregar lições persistidas')
assert(source.includes('startExerciseSession'), 'Exercises.jsx deve iniciar ou retomar sessão persistida')
assert(source.includes('answerExerciseSession'), 'Exercises.jsx deve enviar respostas ao backend')
assert(source.includes('completeExerciseSession'), 'Exercises.jsx deve concluir sessão no backend')
assert(source.includes('summary'), 'Exercises.jsx deve renderizar resumo persistido')
assert(api.includes("'/api'"), 'apiFetch deve usar /api relativo por padrão')

console.log('exercise frontend source checks passed')
