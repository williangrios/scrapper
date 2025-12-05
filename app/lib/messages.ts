/**
 * Array com 20 variações de mensagens para WhatsApp
 * Cada modelo receberá uma mensagem diferente aleatoriamente
 */
export const MENSAGENS_WHATSAPP = [
  `Olá amore ❤️
Tudo bem?
👩‍💻 Sou do suporte do privateshow.com.br
Poderíamos conversar sobre uma oportunidade de renda? 🤗`,

  `Oi! Tudo certo? 💕
Aqui é da equipe privateshow.com.br
Gostaria de apresentar uma proposta interessante 😊`,

  `Olá! Como vai? 🌟
Sou recrutadora do privateshow.com.br
Posso te fazer uma proposta que pode te interessar? 💰`,

  `Oi amore! Tudo bem? ❤️
Trabalho com a plataforma privateshow.com.br
Podemos conversar sobre uma oportunidade? 🤗`,

  `Olá! Td bom? 😊
Sou da equipe do privateshow.com.br
Tenho uma proposta legal pra você! 💼`,

  `Oi! Como está? 💕
Represento o privateshow.com.br
Gostaria de conhecer uma oportunidade de ganhos? 🚀`,

  `Olá querida! Tudo certo? ❤️
Sou do time privateshow.com.br
Posso te apresentar algo interessante? 😊`,

  `Oi! Tudo tranquilo? 🌟
Trabalho no privateshow.com.br
Podemos conversar sobre renda extra? 💰`,

  `Olá! Tá tudo bem? 💕
Aqui é do privateshow.com.br
Você teria interesse em conhecer uma oportunidade? 🤗`,

  `Oi amore! Como vai? ❤️
Sou recrutadora do privateshow.com.br
Posso te fazer uma proposta? 😊`,

  `Olá! Tudo joia? 🌟
Represento a plataforma privateshow.com.br
Gostaria de conversar sobre uma possibilidade de renda? 💼`,

  `Oi! Td bem? 💕
Sou da equipe privateshow.com.br
Podemos bater um papo sobre uma oportunidade? 🚀`,

  `Olá querida! Como está? ❤️
Trabalho com o privateshow.com.br
Tenho algo que pode te interessar! 😊`,

  `Oi! Tudo certinho? 🌟
Aqui é do time privateshow.com.br
Gostaria de conhecer uma proposta? 💰`,

  `Olá lindona! Tudo bom? 💕
Sou do suporte privateshow.com.br
Podemos conversar sobre ganhos? 🤗`,

  `Oi! Como vai você? ❤️
Represento o privateshow.com.br
Posso te apresentar uma oportunidade? 😊`,

  `Olá! Td tranquilo? 🌟
Sou recrutadora do privateshow.com.br
Gostaria de fazer uma proposta pra você! 💼`,

  `Oi querida! Tudo ok? 💕
Trabalho no privateshow.com.br
Podemos conversar sobre renda? 🚀`,

  `Olá! Tudo certo aí? ❤️
Aqui é da equipe privateshow.com.br
Você teria interesse em uma oportunidade? 🤗`,

  `Oi amore! Td joia? 🌟
Sou do privateshow.com.br
Posso te fazer uma proposta interessante? 💰`,
]

/**
 * Retorna uma mensagem aleatória do array
 */
export function getMensagemAleatoria(): string {
  const index = Math.floor(Math.random() * MENSAGENS_WHATSAPP.length)
  return MENSAGENS_WHATSAPP[index]
}

/**
 * Retorna uma mensagem por índice (para distribuição uniforme)
 */
export function getMensagemPorIndice(index: number): string {
  return MENSAGENS_WHATSAPP[index % MENSAGENS_WHATSAPP.length]
}
