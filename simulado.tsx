import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { usePostStore } from '../src/store/postStore';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';
import { Toast } from '../src/components/Toast';
import { Question } from '../src/types';

export default function SimuladoScreen() {
  const router = useRouter();
  const { darkMode } = useAuthStore();
  const { provaAnalysis, saveSimulado, clearProvaAnalysis } = usePostStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | boolean>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [showResults, setShowResults] = useState(false);
  const [discursiveAnswer, setDiscursiveAnswer] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const questions = provaAnalysis?.questoes || [];
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!showResults && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextQuestion();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, showResults]);

  const handleAnswer = (answer: string | boolean) => {
    setAnswers({ ...answers, [currentIndex]: answer });
  };

  const handleNextQuestion = () => {
    // Save discursive answer if applicable
    if (currentQuestion?.tipo === 'discursiva' && discursiveAnswer.trim()) {
      setAnswers({ ...answers, [currentIndex]: discursiveAnswer });
    }
    setDiscursiveAnswer('');
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(60);
    } else {
      finishSimulado();
    }
  };

  const finishSimulado = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowResults(true);

    // Calculate score
    let correct = 0;
    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      if (q.tipo === 'multipla_escolha' && userAnswer === q.resposta_correta) {
        correct++;
      } else if (q.tipo === 'verdadeiro_falso' && userAnswer === q.resposta_correta) {
        correct++;
      }
      // Discursive questions are not auto-graded
    });

    const nonDiscursive = questions.filter(q => q.tipo !== 'discursiva').length;
    const score = nonDiscursive > 0 ? (correct / nonDiscursive) * 100 : 0;

    try {
      await saveSimulado({
        questoes: questions,
        respostas: Object.entries(answers).map(([idx, ans]) => ({
          questao_index: parseInt(idx),
          resposta: ans,
        })),
        score,
      });
    } catch (error) {
      console.error('Error saving simulado:', error);
    }
  };

  const handleClose = () => {
    clearProvaAnalysis();
    router.back();
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'facil': return COLORS.success;
      case 'medio': return COLORS.warning;
      case 'dificil': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  const calculateScore = () => {
    let correct = 0;
    let total = 0;
    questions.forEach((q, i) => {
      if (q.tipo !== 'discursiva') {
        total++;
        const userAnswer = answers[i];
        if (q.tipo === 'multipla_escolha' && userAnswer === q.resposta_correta) {
          correct++;
        } else if (q.tipo === 'verdadeiro_falso' && userAnswer === q.resposta_correta) {
          correct++;
        }
      }
    });
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={60} color={COLORS.darkGray} />
          <Text style={[styles.emptyText, darkMode && styles.textDark]}>Nenhuma questao disponivel</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults) {
    const score = calculateScore();
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreTitle, darkMode && styles.textDark]}>Resultado Final</Text>
            <View style={[styles.scoreCircle, { borderColor: score >= 70 ? COLORS.success : COLORS.error }]}>
              <Text style={[styles.scoreText, { color: score >= 70 ? COLORS.success : COLORS.error }]}>
                {score}%
              </Text>
            </View>
            <Text style={[styles.scoreMessage, darkMode && styles.textMuted]}>
              {score >= 70 ? 'Parabens! Otimo desempenho!' : 'Continue estudando!'}
            </Text>
          </View>

          <Text style={[styles.correctionTitle, darkMode && styles.textDark]}>Correcao Detalhada</Text>
          
          {questions.map((q, index) => {
            const userAnswer = answers[index];
            let isCorrect = false;
            if (q.tipo === 'multipla_escolha') {
              isCorrect = userAnswer === q.resposta_correta;
            } else if (q.tipo === 'verdadeiro_falso') {
              isCorrect = userAnswer === q.resposta_correta;
            }

            return (
              <View key={index} style={[styles.correctionCard, darkMode && styles.correctionCardDark]}>
                <View style={styles.correctionHeader}>
                  <Text style={[styles.questionNum, darkMode && styles.textDark]}>Questao {index + 1}</Text>
                  {q.tipo !== 'discursiva' && (
                    <View style={[styles.resultBadge, { backgroundColor: isCorrect ? COLORS.success : COLORS.error }]}>
                      <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={14} color={COLORS.white} />
                      <Text style={styles.resultBadgeText}>{isCorrect ? 'Correta' : 'Incorreta'}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.questionText, darkMode && styles.textMuted]}>{q.pergunta}</Text>
                
                {q.tipo !== 'discursiva' && (
                  <>
                    <Text style={styles.answerLabel}>Sua resposta: 
                      <Text style={{ color: isCorrect ? COLORS.success : COLORS.error }}>
                        {userAnswer !== undefined ? String(userAnswer) : 'Nao respondida'}
                      </Text>
                    </Text>
                    <Text style={styles.answerLabel}>Resposta correta: 
                      <Text style={{ color: COLORS.success }}> {String(q.resposta_correta)}</Text>
                    </Text>
                  </>
                )}
                
                {q.explicacao && (
                  <View style={[styles.explanationBox, darkMode && styles.explanationBoxDark]}>
                    <Text style={[styles.explanationTitle, darkMode && styles.textDark]}>Explicacao:</Text>
                    <Text style={[styles.explanationText, darkMode && styles.textMuted]}>{q.explicacao}</Text>
                  </View>
                )}
                
                {q.tipo === 'discursiva' && q.resposta_modelo && (
                  <View style={[styles.explanationBox, darkMode && styles.explanationBoxDark]}>
                    <Text style={[styles.explanationTitle, darkMode && styles.textDark]}>Resposta modelo:</Text>
                    <Text style={[styles.explanationText, darkMode && styles.textMuted]}>{q.resposta_modelo}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.finishButton} onPress={handleClose}>
            <Text style={styles.finishButtonText}>Concluir</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.progress}>
          <Text style={[styles.progressText, darkMode && styles.textDark]}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>
        <View style={[styles.timer, { backgroundColor: timeLeft <= 10 ? COLORS.error : COLORS.accent }]}>
          <Ionicons name="time" size={16} color={COLORS.white} />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, darkMode && styles.progressBarDark]}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Question Card */}
        <View style={[styles.questionCard, darkMode && styles.questionCardDark]}>
          <View style={styles.questionMeta}>
            <View style={[styles.nivelTag, { backgroundColor: getNivelColor(currentQuestion.nivel) + '20' }]}>
              <Text style={[styles.nivelTagText, { color: getNivelColor(currentQuestion.nivel) }]}>
                {currentQuestion.nivel}
              </Text>
            </View>
            <View style={[styles.tipoTag, { backgroundColor: COLORS.accent + '20' }]}>
              <Text style={[styles.tipoTagText, { color: COLORS.accent }]}>
                {currentQuestion.tipo === 'multipla_escolha' ? 'Multipla Escolha' :
                 currentQuestion.tipo === 'verdadeiro_falso' ? 'V/F' : 'Discursiva'}
              </Text>
            </View>
          </View>

          <Text style={[styles.questionText, darkMode && styles.textDark]}>
            {currentQuestion.pergunta}
          </Text>

          {/* Options */}
          {currentQuestion.tipo === 'multipla_escolha' && currentQuestion.opcoes && (
            <View style={styles.optionsContainer}>
              {currentQuestion.opcoes.map((opcao, idx) => {
                const letter = opcao.charAt(0);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      darkMode && styles.optionButtonDark,
                      answers[currentIndex] === letter && styles.optionSelected,
                    ]}
                    onPress={() => handleAnswer(letter)}
                  >
                    <Text style={[
                      styles.optionText,
                      darkMode && styles.textDark,
                      answers[currentIndex] === letter && styles.optionTextSelected,
                    ]}>
                      {opcao}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {currentQuestion.tipo === 'verdadeiro_falso' && (
            <View style={styles.vfContainer}>
              <TouchableOpacity
                style={[
                  styles.vfButton,
                  darkMode && styles.vfButtonDark,
                  answers[currentIndex] === true && styles.vfButtonTrue,
                ]}
                onPress={() => handleAnswer(true)}
              >
                <Ionicons name="checkmark" size={24} color={answers[currentIndex] === true ? COLORS.white : COLORS.success} />
                <Text style={[styles.vfText, answers[currentIndex] === true && styles.vfTextSelected]}>Verdadeiro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vfButton,
                  darkMode && styles.vfButtonDark,
                  answers[currentIndex] === false && styles.vfButtonFalse,
                ]}
                onPress={() => handleAnswer(false)}
              >
                <Ionicons name="close" size={24} color={answers[currentIndex] === false ? COLORS.white : COLORS.error} />
                <Text style={[styles.vfText, answers[currentIndex] === false && styles.vfTextSelected]}>Falso</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentQuestion.tipo === 'discursiva' && (
            <TextInput
              style={[styles.discursiveInput, darkMode && styles.discursiveInputDark]}
              placeholder="Digite sua resposta aqui..."
              placeholderTextColor={COLORS.darkGray}
              value={discursiveAnswer}
              onChangeText={setDiscursiveAnswer}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          )}
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={[styles.footer, darkMode && styles.footerDark]}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
          <Text style={styles.nextButtonText}>
            {currentIndex === questions.length - 1 ? 'Finalizar' : 'Proxima'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  containerDark: {
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  headerDark: {
    backgroundColor: COLORS.cardDark,
  },
  progress: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: COLORS.white,
    fontWeight: '700',
    marginLeft: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.lightGray,
  },
  progressBarDark: {
    backgroundColor: COLORS.gray,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    ...SHADOWS.medium,
  },
  questionCardDark: {
    backgroundColor: COLORS.cardDark,
  },
  questionMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  nivelTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  nivelTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tipoTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tipoTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
    lineHeight: 26,
    marginBottom: 20,
  },
  textDark: {
    color: COLORS.white,
  },
  textMuted: {
    color: '#AAAAAA',
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonDark: {
    backgroundColor: COLORS.gray,
  },
  optionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  optionText: {
    fontSize: 15,
    color: COLORS.primary,
  },
  optionTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  vfContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  vfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vfButtonDark: {
    backgroundColor: COLORS.gray,
  },
  vfButtonTrue: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  vfButtonFalse: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  vfText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  vfTextSelected: {
    color: COLORS.white,
  },
  discursiveInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    fontSize: 15,
    color: COLORS.primary,
    minHeight: 150,
  },
  discursiveInputDark: {
    backgroundColor: COLORS.gray,
    color: COLORS.white,
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  footerDark: {
    backgroundColor: COLORS.cardDark,
    borderTopColor: COLORS.gray,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.borderRadius,
    padding: 16,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.borderRadius,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  resultsContent: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 42,
    fontWeight: '700',
  },
  scoreMessage: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
  correctionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  correctionCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  correctionCardDark: {
    backgroundColor: COLORS.cardDark,
  },
  correctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNum: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  answerLabel: {
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: 6,
  },
  explanationBox: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  explanationBoxDark: {
    backgroundColor: COLORS.gray,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },
  finishButton: {
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  finishButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
