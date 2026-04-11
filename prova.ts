export type ProvaPhase = 'config' | 'exam' | 'results';

export interface ExamQuestion {
  id: number;
  tipo: 'multipla_escolha' | 'imagem_ilustrativa' | 'dissertativa';
  pergunta: string;
  descricao_imagem?: string;
  imagem_base64?: string;
  opcoes?: string[];
  resposta_correta?: string;
  resposta_usuario?: string;
}

export interface ExamResult {
  questao: ExamQuestion;
  correta: boolean;
  feedback: string;
}
