import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES } from '../../src/constants/theme';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';
import { ExamQuestion, ExamResult } from '../../src/types/prova';
import type { ProvaPhase } from '../../src/types/prova';

export default function ProvaScreen() {
  const { darkMode } = useAuthStore();
  const router = useRouter();
  const [phase, setPhase] = useState<ProvaPhase>('config');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as const });
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Config
  const [materia, setMateria] = useState('');
  const [curso, setCurso] = useState('');
  const [anotacoes, setAnotacoes] = useState('');
  const [totalQuestoes, setTotalQuestoes] = useState('10');
  const [qtdMultipla, setQtdMultipla] = useState('5');
  const [qtdImagem, setQtdImagem] = useState('2');
  const [qtdDissertativa, setQtdDissertativa] = useState('3');
  const [dificuldade, setDificuldade] = useState('medio');
  const [photos, setPhotos] = useState<string[]>([]);
  const [docNames, setDocNames] = useState<string[]>([]);

  // Exam
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);

  // Results
  const [results, setResults] = useState<ExamResult[]>([]);
  const [score, setScore] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<number[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPostingResult, setIsPostingResult] = useState(false);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.filter(a => a.base64).map(a => `data:image/jpeg;base64,${a.base64}`);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const pickDocs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'audio/*', 'video/*'],
        multiple: true,
      });
      if (!result.canceled && result.assets) {
        setDocNames([...docNames, ...result.assets.map(a => a.name || 'Arquivo')]);
        setToast({ visible: true, message: `${result.assets.length} arquivo(s) adicionado(s)`, type: 'success' });
      }
    } catch (e) {
      setToast({ visible: true, message: 'Erro ao selecionar arquivo', type: 'error' });
    }
  };

  const generateExam = async () => {
    if (!materia.trim()) {
      setToast({ visible: true, message: 'Preencha a materia', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const configPrompt = `
Voce e um professor universitario. Gere uma prova com EXATAMENTE ${totalQuestoes} questoes sobre "${materia}" do curso "${curso || 'Geral'}".

REGRAS OBRIGATORIAS:
- TODAS as questoes devem ser PERGUNTAS (terminar com "?")
- NAO faca afirmacoes. Faca PERGUNTAS que testem o conhecimento do aluno.
- Siga EXATAMENTE esta distribuicao:
  * ${qtdMultipla} questoes de Multipla Escolha (4 alternativas A, B, C, D)
  * ${qtdImagem} questoes com Imagens Ilustrativas (multipla escolha + descricao da imagem/diagrama necessario)
  * ${qtdDissertativa} questoes Dissertativas (o aluno vai digitar a resposta)
- Nivel: ${dificuldade}

${anotacoes ? `Baseie-se nestas anotacoes do aluno: ${anotacoes}` : ''}

Responda APENAS o JSON abaixo, sem markdown, sem texto extra:
{"questoes":[{"id":1,"tipo":"multipla_escolha","pergunta":"Qual...?","opcoes":["A) ...","B) ...","C) ...","D) ..."],"resposta_correta":"A"},{"id":2,"tipo":"imagem_ilustrativa","pergunta":"Observando o diagrama...?","descricao_imagem":"Diagrama de...","opcoes":["A) ...","B) ...","C) ...","D) ..."],"resposta_correta":"B"},{"id":3,"tipo":"dissertativa","pergunta":"Explique...?","resposta_correta":"Resposta modelo"}]}`;
      const response = await api.post('/prova/generate', { prompt: configPrompt });
      if (response.data?.questoes) {
        const parsedQuestions = response.data.questoes.map((q: any, i: number) => ({
          ...q,
          id: i + 1,
          resposta_usuario: '',
          imagem_base64: '',
        }));
        setQuestions(parsedQuestions);
        setPhase('exam');

        // Gerar imagens para questoes com imagem_ilustrativa em background
        const imageQuestions = parsedQuestions.filter((q: ExamQuestion) => q.tipo === 'imagem_ilustrativa' && q.descricao_imagem);
        if (imageQuestions.length > 0) {
          setIsLoadingImages(true);
          setFailedImageIds([]);
          const failed: number[] = [];
          for (let idx = 0; idx < imageQuestions.length; idx++) {
            const iq = imageQuestions[idx];
            let success = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                if (idx > 0 || attempt > 1) {
                  await sleep(2000);
                }
                const imgResp = await api.post('/ai/generate', {
                  tipo: 'imagem',
                  materia: materia,
                  descricao: `Gere uma imagem tecnica/ilustrativa educacional para uma questao de prova: ${iq.descricao_imagem}. Estilo diagrama escolar, limpo e claro.`
                });
                if (imgResp.data.image_base64) {
                  setQuestions(prev => prev.map(pq => pq.id === iq.id ? { ...pq, imagem_base64: imgResp.data.image_base64 } : pq));
                  success = true;
                  break;
                }
              } catch (e) {
                console.log(`Tentativa ${attempt}/3 falhou para questao ${iq.id}`);
              }
            }
            if (!success) {
              failed.push(iq.id);
            }
          }
          if (failed.length > 0) {
            setFailedImageIds(failed);
            setToast({ visible: true, message: `${failed.length} imagem(ns) falharam. Use o botao "Tentar Novamente" na questao.`, type: 'error' });
          }
          setIsLoadingImages(false);
        }
      } else {
        setToast({ visible: true, message: 'Erro no formato da prova. Tente novamente.', type: 'error' });
      }
    } catch (error: any) {
      setToast({ visible: true, message: 'Erro ao gerar prova. Tente novamente.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const answerQuestion = (answer: string) => {
    const updated = [...questions];
    updated[currentQ].resposta_usuario = answer;
    setQuestions(updated);
  };

  const finishExam = async () => {
    setIsLoading(true);
    try {
      const answersText = questions.map(q => {
        return `Questao ${q.id} (${q.tipo}): ${q.pergunta}\nResposta do aluno: ${q.resposta_usuario || '(em branco)'}\nResposta correta: ${q.resposta_correta}`;
      }).join('\n\n');

      const correctionPrompt = `
Corrija a prova do aluno com feedback HUMANIZADO e ENCORAJADOR. Nao use emojis.

${answersText}

Para cada questao:
- Se ACERTOU: valide e explique por que a logica estava correta.
- Se ERROU: diga "Voce quase conseguiu! O caminho correto era [X], porque [explicacao detalhada do conceito]."

Calcule a nota de 0 a 10 proporcional aos acertos.

Responda APENAS o JSON, sem markdown:
{"resultados":[{"questao_id":1,"correta":true,"feedback":"Parabens! Voce acertou porque..."}],"nota_final":7.5,"mensagem_geral":"Mensagem encorajadora"}`;

      const response = await api.post('/prova/generate', { prompt: correctionPrompt });
      const data = response.data;

      if (data?.resultados) {
        const examResults: ExamResult[] = questions.map((q, i) => {
          const r = data.resultados.find((r: any) => r.questao_id === q.id) || data.resultados[i];
          return {
            questao: q,
            correta: r?.correta || false,
            feedback: r?.feedback || 'Sem feedback disponivel.',
          };
        });
        setResults(examResults);
        setScore(data.nota_final || 0);
        setPhase('results');
      } else {
        setToast({ visible: true, message: 'Erro ao processar correcao. Tente novamente.', type: 'error' });
      }
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao corrigir. Tente novamente.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const exportPDF = async (blank: boolean) => {
    const questionsHtml = questions.map((q, i) => {
      let html = `<div style="margin-bottom:20px;padding:15px;border:1px solid #ddd;border-radius:8px;">
        <p><strong>${i + 1}. [${q.tipo === 'multipla_escolha' ? 'Multipla Escolha' : q.tipo === 'imagem_ilustrativa' ? 'Imagem Ilustrativa' : 'Dissertativa'}]</strong></p>
        <p>${q.pergunta}</p>`;
      if (q.descricao_imagem) html += `<p style="color:#666;font-style:italic;">[Imagem: ${q.descricao_imagem}]</p>`;
      if (q.opcoes) html += q.opcoes.map(o => `<p style="margin-left:20px;">${o}</p>`).join('');
      if (!blank && q.tipo === 'dissertativa') html += `<p style="margin-top:10px;"><strong>Resposta:</strong> ${q.resposta_usuario || '___'}</p>`;
      if (!blank && results.length > 0) {
        const r = results[i];
        if (r) html += `<p style="color:${r.correta ? 'green' : 'red'};margin-top:8px;"><strong>${r.correta ? 'CORRETO' : 'INCORRETO'}</strong></p><p>${r.feedback}</p>`;
      }
      html += '</div>';
      return html;
    }).join('');

    const fullHtml = `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial;padding:30px;color:#333;}
      h1{color:#9A1E24;border-bottom:2px solid #9A1E24;padding-bottom:10px;}
    </style></head><body>
      <h1>CampusFlow - Prova de ${materia}</h1>
      <p>Curso: ${curso || 'Geral'} | Dificuldade: ${dificuldade}</p>
      ${!blank && results.length > 0 ? `<p style="font-size:20px;"><strong>Nota: ${score}/10</strong></p>` : ''}
      ${questionsHtml}
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html: fullHtml });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: blank ? 'Prova em Branco' : 'Prova Corrigida' });
      }
    } catch (e) {
      setToast({ visible: true, message: 'Erro ao exportar PDF', type: 'error' });
    }
  };

  const shareResults = async () => {
    const text = `Fiz uma prova de ${materia} no CampusFlow e tirei ${score}/10! Acertei ${results.filter(r => r.correta).length} de ${results.length} questoes.`;
    await Share.share({ message: text });
  };

  const resetExam = () => {
    setPhase('config');
    setQuestions([]);
    setResults([]);
    setScore(0);
    setCurrentQ(0);
    setLiked(null);
    setFailedImageIds([]);
  };

  const retryImageForQuestion = async (questionId: number) => {
    const q = questions.find(qq => qq.id === questionId);
    if (!q || !q.descricao_imagem) return;
    setIsLoadingImages(true);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) await sleep(2000);
        const imgResp = await api.post('/ai/generate', {
          tipo: 'imagem',
          materia: materia,
          descricao: `Gere uma imagem tecnica/ilustrativa educacional para uma questao de prova: ${q.descricao_imagem}. Estilo diagrama escolar, limpo e claro.`
        });
        if (imgResp.data.image_base64) {
          setQuestions(prev => prev.map(pq => pq.id === questionId ? { ...pq, imagem_base64: imgResp.data.image_base64 } : pq));
          setFailedImageIds(prev => prev.filter(id => id !== questionId));
          setToast({ visible: true, message: 'Imagem gerada com sucesso!', type: 'success' });
          setIsLoadingImages(false);
          return;
        }
      } catch (e) {
        console.log(`Retry tentativa ${attempt}/3 para questao ${questionId}`);
      }
    }
    setIsLoadingImages(false);
    setToast({ visible: true, message: 'Falha ao gerar imagem. Tente novamente mais tarde.', type: 'error' });
  };

  const postExamResult = async () => {
    setIsPostingResult(true);
    try {
      const acertos = results.filter(r => r.correta).length;
      const contentText = `Prova de ${materia} (${curso || 'Geral'}) - Nota: ${score.toFixed(1)}/10 - Acertei ${acertos} de ${results.length} questoes. Dificuldade: ${dificuldade}.`;
      await api.post('/posts', {
        category: 'resumos',
        materia: materia,
        curso: curso || 'Geral',
        content: contentText,
        descricao_resumo: contentText,
        file_urls: [],
        anonimo: false,
      });
      setToast({ visible: true, message: 'Resultado publicado no feed!', type: 'success' });
      setTimeout(() => {
        resetExam();
        router.push('/(tabs)');
      }, 1000);
    } catch (error: any) {
      setToast({ visible: true, message: 'Erro ao publicar resultado.', type: 'error' });
    } finally {
      setIsPostingResult(false);
    }
  };

  // ===== RENDER PHASES =====

  const renderConfig = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, darkMode && styles.textDark]}>Preparar Prova</Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Identificacao</Text>
        <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Materia *" placeholderTextColor={COLORS.darkGray} value={materia} onChangeText={setMateria} />
        <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Curso" placeholderTextColor={COLORS.darkGray} value={curso} onChangeText={setCurso} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Materiais de Apoio</Text>
        <View style={styles.uploadRow}>
          <TouchableOpacity style={[styles.uploadCard, darkMode && styles.uploadCardDark]} onPress={pickDocs}>
            <Ionicons name="document-attach" size={24} color={COLORS.accent} />
            <Text style={styles.uploadCardText}>Arquivos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.uploadCard, darkMode && styles.uploadCardDark]} onPress={pickPhotos}>
            <Ionicons name="images" size={24} color={COLORS.accent} />
            <Text style={styles.uploadCardText}>Fotos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.uploadCard, darkMode && styles.uploadCardDark]} onPress={pickDocs}>
            <Ionicons name="musical-notes" size={24} color={COLORS.accent} />
            <Text style={styles.uploadCardText}>Audio/Video</Text>
          </TouchableOpacity>
        </View>
        {docNames.length > 0 && (
          <View style={styles.fileList}>
            {docNames.map((n, i) => (
              <View key={i} style={styles.fileTag}>
                <Ionicons name="document" size={14} color={COLORS.accent} />
                <Text style={styles.fileTagText} numberOfLines={1}>{n}</Text>
                <TouchableOpacity onPress={() => setDocNames(docNames.filter((_, j) => j !== i))}>
                  <Ionicons name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {photos.length > 0 && (
          <ScrollView horizontal style={styles.photosRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: p }} style={styles.photoImg} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos(photos.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <TextInput style={[styles.textArea, darkMode && styles.inputDark]} placeholder="Anotacoes manuais (conteudo escrito)..." placeholderTextColor={COLORS.darkGray} value={anotacoes} onChangeText={setAnotacoes} multiline textAlignVertical="top" />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Configuracao da Prova</Text>
        <View style={styles.configRow}>
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, darkMode && styles.textMuted]}>Total</Text>
            <TextInput style={[styles.configInput, darkMode && styles.inputDark]} value={totalQuestoes} onChangeText={setTotalQuestoes} keyboardType="number-pad" />
          </View>
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, darkMode && styles.textMuted]}>Multipla</Text>
            <TextInput style={[styles.configInput, darkMode && styles.inputDark]} value={qtdMultipla} onChangeText={setQtdMultipla} keyboardType="number-pad" />
          </View>
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, darkMode && styles.textMuted]}>Imagem</Text>
            <TextInput style={[styles.configInput, darkMode && styles.inputDark]} value={qtdImagem} onChangeText={setQtdImagem} keyboardType="number-pad" />
          </View>
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, darkMode && styles.textMuted]}>Dissert.</Text>
            <TextInput style={[styles.configInput, darkMode && styles.inputDark]} value={qtdDissertativa} onChangeText={setQtdDissertativa} keyboardType="number-pad" />
          </View>
        </View>

        <Text style={[styles.configLabel, darkMode && styles.textMuted, { marginTop: 16, marginBottom: 8 }]}>Dificuldade</Text>
        <View style={styles.chipRow}>
          {['facil', 'medio', 'dificil'].map(d => (
            <TouchableOpacity key={d} style={[styles.chip, dificuldade === d && styles.chipActive]} onPress={() => setDificuldade(d)}>
              <Text style={[styles.chipText, dificuldade === d && styles.chipTextActive]}>
                {d === 'facil' ? 'Facil' : d === 'medio' ? 'Medio' : 'Dificil'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={[styles.mainBtn, isLoading && { opacity: 0.5 }]} onPress={generateExam} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color={COLORS.white} /> : (
          <>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
            <Text style={styles.mainBtnText}>Gerar Prova com IA</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderExam = () => {
    const q = questions[currentQ];
    if (!q) return null;
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.examHeader}>
          <Text style={[styles.examProgress, darkMode && styles.textMuted]}>Questao {currentQ + 1} de {questions.length}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {q.tipo === 'multipla_escolha' ? 'Multipla Escolha' : q.tipo === 'imagem_ilustrativa' ? 'Imagem Ilustrativa' : 'Dissertativa'}
            </Text>
          </View>
        </View>

        <Text style={[styles.questionText, darkMode && styles.textDark]}>{q.pergunta}</Text>

        {q.tipo === 'imagem_ilustrativa' && (
          q.imagem_base64 ? (
            <TouchableOpacity style={styles.questionImage} onPress={() => setPreviewImage(q.imagem_base64 || null)} activeOpacity={0.8}>
              <Image source={{ uri: q.imagem_base64 }} style={styles.questionImg} resizeMode="contain" />
              <View style={styles.tapToEnlarge}>
                <Ionicons name="expand-outline" size={14} color={COLORS.white} />
                <Text style={styles.tapToEnlargeText}>Toque para ampliar</Text>
              </View>
            </TouchableOpacity>
          ) : isLoadingImages ? (
            <View style={[styles.imageDesc, darkMode && styles.imageDescDark]}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={[styles.imageDescText, darkMode && styles.textMuted]}>Gerando imagem...</Text>
            </View>
          ) : failedImageIds.includes(q.id) ? (
            <View style={[styles.imageDesc, darkMode && styles.imageDescDark]}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={[styles.imageDescText, { color: COLORS.error }]}>Falha ao gerar imagem</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => retryImageForQuestion(q.id)}>
                <Ionicons name="refresh" size={16} color={COLORS.accent} />
                <Text style={styles.retryBtnText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          ) : q.descricao_imagem ? (
            <View style={[styles.imageDesc, darkMode && styles.imageDescDark]}>
              <Ionicons name="image" size={18} color={COLORS.accent} />
              <Text style={[styles.imageDescText, darkMode && styles.textMuted]}>[Imagem: {q.descricao_imagem}]</Text>
            </View>
          ) : null
        )}

        {(q.tipo === 'multipla_escolha' || q.tipo === 'imagem_ilustrativa') && q.opcoes ? (
          <View style={styles.optionsContainer}>
            {q.opcoes.map((opcao, i) => {
              const letter = opcao.charAt(0);
              const isSelected = q.resposta_usuario === letter;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionBtn, isSelected && styles.optionBtnSelected, darkMode && styles.optionBtnDark]}
                  onPress={() => answerQuestion(letter)}
                >
                  <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                    <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>{letter}</Text>
                  </View>
                  <Text style={[styles.optionText, darkMode && styles.textDark]}>{opcao.substring(3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TextInput
            style={[styles.textArea, darkMode && styles.inputDark, { minHeight: 150 }]}
            placeholder="Digite sua resposta..."
            placeholderTextColor={COLORS.darkGray}
            value={q.resposta_usuario}
            onChangeText={answerQuestion}
            multiline
            textAlignVertical="top"
          />
        )}

        <View style={styles.navRow}>
          {currentQ > 0 && (
            <TouchableOpacity style={[styles.navBtn, darkMode && styles.navBtnDark]} onPress={() => setCurrentQ(currentQ - 1)}>
              <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={[styles.navBtnText, darkMode && styles.textDark]}>Anterior</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {currentQ < questions.length - 1 ? (
            <TouchableOpacity style={[styles.navBtn, darkMode && styles.navBtnDark]} onPress={() => setCurrentQ(currentQ + 1)}>
              <Text style={[styles.navBtnText, darkMode && styles.textDark]}>Proxima</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.mainBtn, isLoading && { opacity: 0.5 }, { flex: 0, paddingHorizontal: 30 }]} onPress={finishExam} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.mainBtnText}>Finalizar</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderResults = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, darkMode && styles.textMuted]}>Sua Nota</Text>
        <Text style={[styles.scoreValue, { color: score >= 6 ? COLORS.success : COLORS.error }]}>{score.toFixed(1)}</Text>
        <Text style={[styles.scoreMax, darkMode && styles.textMuted]}>/10</Text>
        <Text style={[styles.scoreDetail, darkMode && styles.textMuted]}>
          Acertou {results.filter(r => r.correta).length} de {results.length} questoes
        </Text>
      </View>

      {results.map((r, i) => (
        <View key={i} style={[styles.resultCard, darkMode && styles.resultCardDark, r.correta ? styles.resultCorrect : styles.resultWrong]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultQ, darkMode && styles.textDark]}>Questao {i + 1}</Text>
            <Ionicons name={r.correta ? 'checkmark-circle' : 'close-circle'} size={24} color={r.correta ? COLORS.success : COLORS.error} />
          </View>
          <Text style={[styles.resultPergunta, darkMode && styles.textDark]} numberOfLines={2}>{r.questao.pergunta}</Text>
          <Text style={[styles.resultFeedback, darkMode && styles.textMuted]}>{r.feedback}</Text>
        </View>
      ))}

      <View style={styles.exportSection}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Exportar</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportPDF(true)}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.accent} />
            <Text style={styles.exportBtnText}>PDF Branco</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportPDF(false)}>
            <Ionicons name="document-text" size={22} color={COLORS.success} />
            <Text style={[styles.exportBtnText, { color: COLORS.success }]}>PDF Corrigido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={shareResults}>
            <Ionicons name="share-social" size={22} color={COLORS.primary} />
            <Text style={styles.exportBtnText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.feedbackSection}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Avalie esta prova</Text>
        <View style={styles.feedbackRow}>
          <TouchableOpacity style={[styles.feedbackBtn, liked === true && { backgroundColor: COLORS.success + '30' }]} onPress={() => setLiked(true)}>
            <Ionicons name="thumbs-up" size={28} color={liked === true ? COLORS.success : COLORS.darkGray} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.feedbackBtn, liked === false && { backgroundColor: COLORS.error + '30' }]} onPress={() => setLiked(false)}>
            <Ionicons name="thumbs-down" size={28} color={liked === false ? COLORS.error : COLORS.darkGray} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, isPostingResult && { opacity: 0.5 }]}
        onPress={postExamResult}
        disabled={isPostingResult}
      >
        {isPostingResult ? <ActivityIndicator color={COLORS.white} /> : (
          <>
            <Ionicons name="megaphone-outline" size={20} color={COLORS.white} />
            <Text style={styles.mainBtnText}>Postar Resultado no Feed</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.mainBtn, { backgroundColor: COLORS.gray }]} onPress={resetExam}>
        <Ionicons name="refresh" size={20} color={COLORS.white} />
        <Text style={styles.mainBtnText}>Nova Prova</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, darkMode && styles.headerDark]}>
          {phase !== 'config' && (
            <TouchableOpacity onPress={() => phase === 'exam' ? setPhase('config') : resetExam()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>
            {phase === 'config' ? 'Preparar Prova' : phase === 'exam' ? 'Prova' : 'Resultado'}
          </Text>
          {phase !== 'config' ? (
            <TouchableOpacity onPress={resetExam} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={darkMode ? COLORS.white : COLORS.error} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>
        {phase === 'config' && renderConfig()}
        {phase === 'exam' && renderExam()}
        {phase === 'results' && renderResults()}
      </KeyboardAvoidingView>

      {/* Modal de Preview de Imagem */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  containerDark: { backgroundColor: COLORS.backgroundDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  headerDark: { borderBottomColor: COLORS.gray },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  backBtn: { padding: 4 },
  textDark: { color: COLORS.white },
  textMuted: { color: COLORS.darkGray },
  scrollContent: { padding: SIZES.padding, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  input: {
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.primary, marginBottom: 10,
  },
  inputDark: { backgroundColor: COLORS.cardDark, color: COLORS.white },
  textArea: {
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.primary, minHeight: 100, marginTop: 10,
  },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  uploadCard: {
    flex: 1, alignItems: 'center', padding: 16, marginHorizontal: 4,
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.accent,
  },
  uploadCardDark: { backgroundColor: COLORS.cardDark },
  uploadCardText: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginTop: 4 },
  fileList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  fileTag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '15',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  fileTagText: { fontSize: 12, color: COLORS.primary, marginHorizontal: 6, maxWidth: 100 },
  photosRow: { marginTop: 8 },
  photoThumb: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', marginRight: 8 },
  photoImg: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: -2, right: -2 },
  configRow: { flexDirection: 'row', justifyContent: 'space-between' },
  configItem: { flex: 1, marginHorizontal: 4 },
  configLabel: { fontSize: 12, color: COLORS.darkGray, marginBottom: 4, textAlign: 'center' },
  configInput: {
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700',
    color: COLORS.primary, textAlign: 'center',
  },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.lightGray, marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.accent },
  chipText: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: SIZES.borderRadius,
    paddingVertical: 16, marginTop: 16,
  },
  mainBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16, marginLeft: 8 },
  examHeader: { marginBottom: 24 },
  examProgress: { fontSize: 14, color: COLORS.darkGray, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: COLORS.lightGray, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.accent + '20',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10,
  },
  typeBadgeText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '600', color: COLORS.primary, lineHeight: 26, marginBottom: 20 },
  imageDesc: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius, padding: 12, marginBottom: 16,
  },
  imageDescDark: { backgroundColor: COLORS.cardDark },
  imageDescText: { fontSize: 13, color: COLORS.darkGray, marginLeft: 8, flex: 1 },
  questionImage: {
    borderRadius: SIZES.borderRadius, overflow: 'hidden', marginBottom: 16,
    backgroundColor: COLORS.lightGray,
  },
  questionImg: { width: '100%', height: 220, borderRadius: SIZES.borderRadius },
  optionsContainer: { marginBottom: 20 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  optionBtnSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '10' },
  optionBtnDark: { backgroundColor: COLORS.cardDark },
  optionCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 2, borderColor: COLORS.lightGray,
  },
  optionCircleSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  optionLetter: { fontSize: 14, fontWeight: '700', color: COLORS.gray },
  optionLetterSelected: { color: COLORS.white },
  optionText: { fontSize: 15, color: COLORS.primary, flex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: SIZES.borderRadius, backgroundColor: COLORS.lightGray,
  },
  navBtnDark: { backgroundColor: COLORS.cardDark },
  navBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginHorizontal: 6 },
  scoreContainer: {
    alignItems: 'center', marginBottom: 30, paddingVertical: 20,
  },
  scoreLabel: { fontSize: 14, color: COLORS.darkGray },
  scoreValue: { fontSize: 72, fontWeight: '700' },
  scoreMax: { fontSize: 24, color: COLORS.darkGray, marginTop: -10 },
  scoreDetail: { fontSize: 14, color: COLORS.darkGray, marginTop: 8 },
  resultCard: {
    borderRadius: SIZES.borderRadius, padding: 16, marginBottom: 12,
    backgroundColor: COLORS.lightGray, borderLeftWidth: 4,
  },
  resultCardDark: { backgroundColor: COLORS.cardDark },
  resultCorrect: { borderLeftColor: COLORS.success },
  resultWrong: { borderLeftColor: COLORS.error },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultQ: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  resultPergunta: { fontSize: 14, color: COLORS.primary, marginBottom: 8 },
  resultFeedback: { fontSize: 13, color: COLORS.darkGray, lineHeight: 20 },
  exportSection: { marginTop: 20, marginBottom: 16 },
  exportRow: { flexDirection: 'row', justifyContent: 'space-between' },
  exportBtn: {
    flex: 1, alignItems: 'center', padding: 14, marginHorizontal: 4,
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
  },
  exportBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.accent, marginTop: 4 },
  feedbackSection: { marginTop: 16, alignItems: 'center' },
  feedbackRow: { flexDirection: 'row' },
  feedbackBtn: {
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.lightGray, marginHorizontal: 16,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', marginLeft: 12,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.accent + '20',
  },
  retryBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.accent, marginLeft: 4 },
  tapToEnlarge: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tapToEnlargeText: { fontSize: 11, color: COLORS.white, marginLeft: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.7,
  },
});
