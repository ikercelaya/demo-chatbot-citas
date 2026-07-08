export type MessageRole = 'customer' | 'assistant' | 'staff';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerContact: string;
  paused: boolean;
  pausedBy: 'customer' | 'admin' | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface DemoStore {
  conversations: Conversation[];
}

declare global {
  // eslint-disable-next-line no-var
  var __renoveplacDemoStore: DemoStore | undefined;
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function store(): DemoStore {
  if (!globalThis.__renoveplacDemoStore) {
    globalThis.__renoveplacDemoStore = { conversations: [] };
  }
  return globalThis.__renoveplacDemoStore;
}

function touch(conversation: Conversation) {
  conversation.updatedAt = now();
}

function makeMessage(role: MessageRole, text: string): ChatMessage {
  return {
    id: id('msg'),
    role,
    text: text.trim(),
    createdAt: now(),
  };
}

function includesAny(text: string, words: string[]) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return words.some((word) => normalized.includes(word));
}

export function listConversations() {
  return [...store().conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getConversation(conversationId: string) {
  return store().conversations.find((conversation) => conversation.id === conversationId) ?? null;
}

export function handleCustomerMessage(input: {
  conversationId?: string | null;
  customerName?: string | null;
  customerContact?: string | null;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error('Mensaje vacío');

  let conversation =
    input.conversationId ? getConversation(input.conversationId) : null;

  if (!conversation) {
    const createdAt = now();
    conversation = {
      id: id('conv'),
      customerName: input.customerName?.trim() || 'Cliente demo',
      customerContact: input.customerContact?.trim() || '',
      paused: false,
      pausedBy: null,
      createdAt,
      updatedAt: createdAt,
      messages: [
        makeMessage(
          'assistant',
          'Hola, soy el asistente de Pro Strength Irún. Puedo resolver dudas sobre el gimnasio, horarios, ubicación, servicios y entrenamiento.',
        ),
      ],
    };
    store().conversations.push(conversation);
  } else {
    conversation.customerName =
      input.customerName?.trim() || conversation.customerName || 'Cliente demo';
    conversation.customerContact = input.customerContact?.trim() || conversation.customerContact;
  }

  conversation.messages.push(makeMessage('customer', text));

  if (shouldEscalate(text)) {
    conversation.paused = true;
    conversation.pausedBy = 'customer';
    conversation.messages.push(
      makeMessage(
        'assistant',
        'De acuerdo. Nuestro personal revisará tu mensaje y te responderá lo antes posible. Mientras tanto, dejo pausado el bot en esta conversación.',
      ),
    );
  } else if (!conversation.paused) {
    conversation.messages.push(makeMessage('assistant', answerFor(text)));
  }

  touch(conversation);
  return conversation;
}

export function setConversationPaused(conversationId: string, paused: boolean) {
  const conversation = getConversation(conversationId);
  if (!conversation) return null;

  conversation.paused = paused;
  conversation.pausedBy = paused ? 'admin' : null;
  conversation.messages.push(
    makeMessage(
      'staff',
      paused
        ? 'El equipo ha pausado el bot para revisar esta conversación.'
        : 'El equipo ha reactivado el bot en esta conversación.',
    ),
  );
  touch(conversation);
  return conversation;
}

export function addStaffMessage(conversationId: string, text: string) {
  const conversation = getConversation(conversationId);
  if (!conversation) return null;

  conversation.paused = true;
  conversation.pausedBy = 'admin';
  conversation.messages.push(makeMessage('staff', text));
  touch(conversation);
  return conversation;
}

function shouldEscalate(text: string) {
  return includesAny(text, [
    'persona',
    'humano',
    'agente',
    'asesor',
    'llamad',
    'telefono',
    'contactad',
    'hablar con alguien',
    'hablar con una persona',
  ]);
}

function answerFor(text: string) {
  if (includesAny(text, ['precio', 'tarifa', 'cuanto cuesta', 'coste', 'plan', 'mensualidad'])) {
    return [
      'En Pro Strength Irun hay 2 planes disponibles:',
      '',
      '- **Plan Básico**: pensado para entrenar en horarios estándar. Incluye acceso a maquinaria profesional, app móvil + entrenamiento y parking. Horario: lunes a viernes de 7:00 a 22:00 y fines de semana de 9:00 a 14:00. Modalidades: trimestral, semestral y anual.',
      '',
      '- **Plan Pro**: pensado para tener máxima libertad horaria. Incluye acceso a maquinaria profesional, app móvil + entrenamiento y parking. Horario: todos los días del año de 05:00 a 00:00. Modalidades: semestral y anual.',
      '',
      'Todos los planes incluyen ambiente controlado y comunidad exclusiva. También existe posibilidad de escáner Fit3D y test epigenético con cargo adicional. Para precios exactos y mas información, pregunta a Eva +34 699 84 51 99.',
    ].join('\n');
  }

  if (includesAny(text, ['horario', 'abierto', 'hora', 'cierran', 'abren'])) {
    return 'El gimnasio tiene horario amplio. Según la ficha del negocio: lunes a viernes de 5:00 a 24:00, y sábados y domingos de 6:00 a 24:00. En la web también se distingue horario básico y horario pro.';
  }

  if (includesAny(text, ['direccion', 'dirección', 'donde', 'ubicacion', 'ubicación', 'irun', 'irún'])) {
    return 'Pro Strength Irún está en Letxumborro Hiribidea, 83, Irún. También puedes usar la web prostrengthirun.es para llegar o contactar.';
  }

  if (includesAny(text, ['telefono', 'teléfono', 'whatsapp', 'contacto', 'llamar'])) {
    return 'Puedes contactar con Pro Strength Irún en el +34 699 84 51 99. También aparece como contacto de WhatsApp en la ficha del negocio.';
  }

  if (includesAny(text, ['web', 'pagina', 'página', 'url', 'sitio'])) {
    return 'La web de Pro Strength Irun es https://prostrengthirun.es/. Para precios exactos o dudas sobre los planes, pregunta a Eva en el +34 699 84 51 99.';
  }

  if (includesAny(text, ['maquinas', 'máquinas', 'peso', 'mancuernas', 'equipamiento', 'poleas'])) {
    return 'El gimnasio está orientado al entrenamiento de fuerza: 600 m², más de 3000 kg en peso libre, máquinas profesionales de palancas, mancuernas hasta 60 kg, cruce de poleas, aire acondicionado y aparcamiento exterior.';
  }

  if (includesAny(text, ['entrenador', 'entrenamiento personalizado', 'personalizado', 'rutina'])) {
    return 'Sí, Pro Strength Irún ofrece entrenamientos personalizados adaptados a las necesidades y objetivos de cada cliente, con entrenadores certificados.';
  }

  if (includesAny(text, ['nutricion', 'nutrición', 'dieta', 'nutricionista'])) {
    return 'Sí, el equipo cuenta con asesoramiento nutricional personalizado para ayudar a alcanzar objetivos de salud, rendimiento y bienestar.';
  }

  if (includesAny(text, ['edad', 'anos', 'años', 'menor'])) {
    return 'Se puede acceder a partir de los 16 años. Si eres menor de edad, asegúrate de contar con autorización.';
  }

  if (includesAny(text, ['fit3d', 'escanner', 'escáner', 'epigenetico', 'epigenético'])) {
    return 'Pro Strength Irún trabaja con tecnología como escáner corporal Fit3D, test epigenéticos y asesoramiento profesional para entrenar con método.';
  }

  if (includesAny(text, ['cita', 'visita', 'agendar', 'reservar', 'apuntar', 'inscribir'])) {
    return 'De momento esta demo no hace inscripciones ni agenda visitas automáticamente. Puedo resolver dudas generales o, si lo prefieres, pedir que una persona del equipo te responda.';
  }

  if (includesAny(text, ['hola', 'buenas', 'hey'])) {
    return 'Hola. Cuéntame qué necesitas saber sobre Pro Strength Irún y te respondo al momento.';
  }

  return 'Puedo ayudarte con dudas sobre horarios, ubicación, contacto, tarifas, entrenamientos personalizados, nutrición, equipamiento y acceso al gimnasio. Si necesitas atención humana, pídeme hablar con una persona.';
}
