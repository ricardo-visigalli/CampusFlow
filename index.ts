export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  age?: number;
  gender?: string;
  marital_status?: string;
  faculdade_id?: string;
  faculdade_name?: string;
  campus_id?: string;
  campus_name?: string;
  curso_id?: string;
  curso_name?: string;
  ra?: string;
  photo_url?: string;
  star_rating?: number;
  notifications_enabled?: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  author_name?: string;
  author_photo?: string;
  author_username?: string;
  author_star?: number;
  title?: string;
  content?: string;
  category: string;
  anonimo: boolean;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  file_urls: string[];
  created_at: string;
  user_vote?: string;
  assunto?: string;
  urgencia?: string;
  legenda?: string;
  localizacao?: string;
  marcacoes?: string[];
  titulo_vaga?: string;
  empresa?: string;
  descricao_vaga?: string;
  requisitos?: string;
  beneficios?: string;
  salario?: string;
  tipo_contrato?: string;
  curso?: string;
  materia?: string;
  nivel_beleza?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_username?: string;
  author_photo?: string;
  content: string;
  created_at: string;
}

export interface Faculdade {
  id: string;
  name: string;
}

export interface Campus {
  id: string;
  faculdade_id: string;
  name: string;
}

export interface Curso {
  id: string;
  campus_id: string;
  name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ProvaAnalysis {
  resumo: string;
  topicos_importantes: string[];
  questoes: Question[];
}

export interface Question {
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'discursiva';
  nivel: 'facil' | 'medio' | 'dificil';
  pergunta: string;
  opcoes?: string[];
  resposta_correta?: string | boolean;
  resposta_modelo?: string;
  explicacao?: string;
}

export interface Simulado {
  id: string;
  user_id: string;
  questoes: Question[];
  respostas: any[];
  score: number;
  created_at: string;
}

export interface UserStats {
  total_simulados: number;
  taxa_acerto: number;
  total_posts: number;
  total_upvotes_received: number;
}
