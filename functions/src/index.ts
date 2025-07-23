// import * as functions from "firebase-functions/v1"
// import { db } from "./firebase"
// import { verificarGanhador } from "./drawEngine"

// === Funções agendadas removidas/comentadas ===

// export const scheduledCheckWinners = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
//   const snapshot = await db.collection("draws").where("status", "==", "active").get()
//
//   for (const doc of snapshot.docs) {
//     await verificarGanhador(doc.id)
//   }
// })

// export const scheduledStartDraws = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
//   const now = new Date()
//   const snapshot = await db.collection("draws").where("status", "==", "waiting").get()
//
//   for (const doc of snapshot.docs) {
//     const data = doc.data()
//     const startTime = data.dateTime.toDate?.() || data.dateTime
//     if (startTime <= now) {
//       await db.collection("draws").doc(doc.id).update({ status: "active" })
//     }
//   }
// })

// export const scheduledAutomaticDraw = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
//   const snapshot = await db.collection("draws")
//     .where("status", "==", "active")
//     .where("mode", "==", "automatic")
//     .get()
//
//   for (const doc of snapshot.docs) {
//     const drawData = doc.data()
//     const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
//     const drawnNumbers = drawData.drawnNumbers || []
//     const availableNumbers = allNumbers.filter((n) => !drawnNumbers.includes(n))
//
//     if (availableNumbers.length === 0) continue // já acabou
//
//     // Sorteia um novo número
//     const randomIndex = Math.floor(Math.random() * availableNumbers.length)
//     const newNumber = availableNumbers[randomIndex]
//     const newDrawnNumbers = [...drawnNumbers, newNumber]
//
//     // Atualiza o sorteio com o novo número
//     await db.collection("draws").doc(doc.id).update({
//       drawnNumbers: newDrawnNumbers,
//     })
//
//     // Chama a função de verificação de ganhador
//     await verificarGanhador(doc.id)
//   }
// })
