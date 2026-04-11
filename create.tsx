import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../src/store/authStore';
import { usePostStore } from '../../src/store/postStore';
import { COLORS, SIZES, CATEGORIES } from '../../src/constants/theme';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';

type CategoryType = 'avisos' | 'momentos' | 'estagios' | 'paquera' | 'resumos' | 'memes' | '';

export default function CreatePostScreen() {
  const router = useRouter();
  const { darkMode } = useAuthStore();
  const { createPost, fetchPosts } = usePostStore();

  const [category, setCategory] = useState<CategoryType>('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as const });
  const [files, setFiles] = useState<string[]>([]);

  // Avisos
  const [assunto, setAssunto] = useState('');
  const [avisosText, setAvisosText] = useState('');
  const [urgencia, setUrgencia] = useState('');

  // Momentos
  const [legenda, setLegenda] = useState('');
  const [localizacao, setLocalizacao] = useState('');

  // Estagios
  const [tituloVaga, setTituloVaga] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [descricaoVaga, setDescricaoVaga] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [salario, setSalario] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [linkedinEmpresa, setLinkedinEmpresa] = useState('');
  const [instagramEmpresa, setInstagramEmpresa] = useState('');
  const [siteEmpresa, setSiteEmpresa] = useState('');

  // Paquera
  const [paqueraLegenda, setPaqueraLegenda] = useState('');
  const [nivelBeleza, setNivelBeleza] = useState(5);

  // Resumos
  const [cursoResumo, setCursoResumo] = useState('');
  const [materiaResumo, setMateriaResumo] = useState('');
  const [descricaoResumo, setDescricaoResumo] = useState('');
  const [gerarImagemIA, setGerarImagemIA] = useState(false);
  const [modoIAResumo, setModoIAResumo] = useState(false);
  const [aiResumoContent, setAiResumoContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageBase64, setAiImageBase64] = useState('');
  const [aiImageLoading, setAiImageLoading] = useState(false);

  // Memes
  const [memeLegenda, setMemeLegenda] = useState('');
  const [modoIAMeme, setModoIAMeme] = useState(false);
  const [promptMeme, setPromptMeme] = useState('');
  const [aiMemeContent, setAiMemeContent] = useState('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [imageSelected, setImageSelected] = useState(false);
  const resetAll = () => {
    setCategory('');
    setFiles([]);
    setAssunto(''); setAvisosText(''); setUrgencia('');
    setLegenda(''); setLocalizacao('');
    setTituloVaga(''); setEmpresa(''); setDescricaoVaga(''); setRequisitos(''); setBeneficios(''); setSalario(''); setTipoContrato('');
    setLinkedinEmpresa(''); setInstagramEmpresa(''); setSiteEmpresa('');
    setPaqueraLegenda(''); setNivelBeleza(5);
    setCursoResumo(''); setMateriaResumo(''); setDescricaoResumo(''); setGerarImagemIA(false);
    setModoIAResumo(false); setAiResumoContent('');
    setMemeLegenda(''); setModoIAMeme(false); setPromptMeme(''); setAiMemeContent('');
    setAiImageBase64(''); setImageSelected(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const newFiles = result.assets
        .filter(asset => asset.base64)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      setFiles([...files, ...newFiles].slice(0, 10));
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
      });
      if (!result.canceled && result.assets) {
        const docNames = result.assets.map(a => a.name || 'Arquivo');
        setToast({ visible: true, message: `${docNames.length} arquivo(s) selecionado(s): ${docNames.join(', ')}`, type: 'success' });
      }
    } catch (e) {
      setToast({ visible: true, message: 'Erro ao selecionar arquivo', type: 'error' });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setToast({ visible: true, message: 'Permissao de camera necessaria', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setFiles([...files, `data:image/jpeg;base64,${result.assets[0].base64}`].slice(0, 10));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // AI Generation
  const generateAI = async (tipo: 'resumo' | 'meme') => {
    setAiLoading(true);
    try {
      const payload: any = { tipo };
      if (tipo === 'resumo') {
        payload.materia = materiaResumo || cursoResumo || 'Geral';
        payload.descricao = descricaoResumo || `Resumo completo sobre ${materiaResumo || cursoResumo}`;
      } else {
        payload.prompt = promptMeme;
      }
      const response = await api.post('/ai/generate', payload);
      if (tipo === 'resumo') {
        setAiResumoContent(response.data.content);
      } else {
        setAiMemeContent(response.data.content);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Erro ao gerar com IA. Tente novamente.';
      setToast({ visible: true, message: msg, type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const generateImageDesc = async () => {
    setAiImageLoading(true);
    try {
      const payload = {
        tipo: 'imagem',
        materia: materiaResumo || cursoResumo || 'Geral',
        descricao: descricaoResumo || `Infografico sobre ${materiaResumo || cursoResumo}`
      };
      const response = await api.post('/ai/generate', payload);
      if (response.data.image_base64) {
        setAiImageBase64(response.data.image_base64);
      }
      setToast({ visible: true, message: 'Imagem gerada!', type: 'success' });
    } catch (error: any) {
      setToast({ visible: true, message: 'Erro ao gerar imagem. Tente novamente.', type: 'error' });
    } finally {
      setAiImageLoading(false);
    }
  };

  const generateMemeImage = async () => {
    setAiImageLoading(true);
    try {
      const payload = {
        tipo: 'imagem',
        materia: promptMeme || memeLegenda || 'meme universitario',
        descricao: `Gere uma imagem de MEME engracado e sarcastico sobre: ${promptMeme || memeLegenda}. Estilo meme de internet, humor universitario.`
      };
      const response = await api.post('/ai/generate', payload);
      if (response.data.image_base64) {
        setAiImageBase64(response.data.image_base64);
        setFiles(prev => [...prev, response.data.image_base64]);
      }
    } catch (error: any) {
      setToast({ visible: true, message: 'Erro ao gerar meme. Tente novamente.', type: 'error' });
    } finally {
      setAiImageLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setToast({ visible: true, message: 'Texto copiado!', type: 'success' });
  };

  const shareAsPDF = async (text: string, title: string) => {
    try {
      const htmlContent = `
        <html><head><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
          h1 { color: #9A1E24; border-bottom: 2px solid #9A1E24; padding-bottom: 10px; }
          h2, h3 { color: #1A1A1A; }
          p { margin-bottom: 10px; }
        </style></head>
        <body><h1>CampusFlow - ${title}</h1>${text.split('\n').map(line => {
          if (line.startsWith('**') && line.endsWith('**')) return '<h2>' + line.replace(/\*\*/g, '') + '</h2>';
          if (line.startsWith('- ')) return '<li>' + line.substring(2) + '</li>';
          return '<p>' + line + '</p>';
        }).join('')}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Resumo' });
      }
    } catch (error) {
      await Share.share({ message: text, title: title });
    }
  };

  const buildPayload = () => {
    const base: any = { category, file_urls: files };
    switch (category) {
      case 'avisos':
        return { ...base, assunto, content: avisosText, urgencia: urgencia || 'media', anonimo: false };
      case 'momentos':
        return { ...base, legenda, localizacao, anonimo: false };
      case 'estagios':
        return { ...base, titulo_vaga: tituloVaga, empresa, descricao_vaga: descricaoVaga, requisitos, beneficios, salario, tipo_contrato: tipoContrato, linkedin_empresa: linkedinEmpresa, instagram_empresa: instagramEmpresa, site_empresa: siteEmpresa, anonimo: true };
      case 'paquera':
        return { ...base, legenda: paqueraLegenda, nivel_beleza: nivelBeleza, anonimo: true };
      case 'resumos':
        return { ...base, curso: cursoResumo, materia: materiaResumo, descricao_resumo: aiResumoContent || descricaoResumo, gerar_imagem_ia: gerarImagemIA, anonimo: false };
      case 'memes':
        return { ...base, legenda: memeLegenda, modo_ia_meme: modoIAMeme, prompt_meme: promptMeme, anonimo: false };
      default:
        return base;
    }
  };

  const canSubmit = () => {
    switch (category) {
      case 'avisos': return assunto.trim().length > 0;
      case 'momentos': return files.length > 0;
      case 'estagios': return tituloVaga.trim().length > 0 && empresa.trim().length > 0;
      case 'paquera': return files.length > 0;
      case 'resumos': return materiaResumo.trim().length > 0;
      case 'memes': return files.length > 0 || (modoIAMeme && (promptMeme.trim().length > 0 || aiMemeContent.length > 0));
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setIsLoading(true);
    try {
      await createPost(buildPayload());
      setToast({ visible: true, message: 'Publicado com sucesso!', type: 'success' });
      resetAll();
      await fetchPosts();
      setTimeout(() => router.push('/(tabs)'), 800);
    } catch (error: any) {
      setToast({ visible: true, message: error.response?.data?.detail || 'Erro ao publicar', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (label: string, value: string, setter: (t: string) => void, placeholder: string, multiline = false, icon?: string) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, darkMode && styles.textDark]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon && <Ionicons name={icon as any} size={18} color={COLORS.darkGray} style={{ position: 'absolute', left: 14, zIndex: 1 }} />}
        <TextInput
          style={[multiline ? styles.textArea : styles.input, darkMode && styles.inputDark, icon && { paddingLeft: 42 }]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.darkGray}
          value={value}
          onChangeText={setter}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );

  const renderFileSection = (cameraOnly = false, withDocs = false) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, darkMode && styles.textDark]}>{cameraOnly ? 'Foto (Camera)' : 'Anexos'}</Text>
      <View style={styles.fileButtons}>
        {cameraOnly ? (
          <TouchableOpacity style={[styles.uploadBtn, darkMode && styles.uploadBtnDark, { flex: 1 }]} onPress={takePhoto}>
            <Ionicons name="camera" size={22} color={COLORS.accent} />
            <Text style={styles.uploadBtnText}>Tirar Foto</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.uploadBtn, darkMode && styles.uploadBtnDark, { flex: 1, marginRight: 6 }]} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color={COLORS.accent} />
              <Text style={styles.uploadBtnText}>Galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.uploadBtn, darkMode && styles.uploadBtnDark, { flex: 1, marginRight: 6 }]} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color={COLORS.accent} />
              <Text style={styles.uploadBtnText}>Camera</Text>
            </TouchableOpacity>
            {withDocs && (
              <TouchableOpacity style={[styles.uploadBtn, darkMode && styles.uploadBtnDark, { flex: 1 }]} onPress={pickDocument}>
                <Ionicons name="document-outline" size={20} color={COLORS.accent} />
                <Text style={styles.uploadBtnText}>Arquivos</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      {files.length > 0 && (
        <View style={styles.filesRow}>
          {files.map((f, i) => (
            <View key={i} style={styles.fileThumb}>
              <Image source={{ uri: f }} style={styles.fileImg} />
              <TouchableOpacity style={styles.removeFile} onPress={() => removeFile(i)}>
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // AI Preview component with copy/share/like/dislike/regenerate
  const renderAIPreview = (content: string, tipo: 'resumo' | 'meme', onClear: () => void) => {
    if (aiLoading) {
      return (
        <View style={[styles.aiPreview, darkMode && styles.aiPreviewDark]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={[styles.aiLoadingText, darkMode && styles.textMuted]}>Gerando com IA...</Text>
        </View>
      );
    }
    if (!content) return null;
    return (
      <View style={[styles.aiPreview, darkMode && styles.aiPreviewDark]}>
        <Text style={[styles.aiPreviewTitle, darkMode && styles.textDark]}>Resultado da IA</Text>
        <ScrollView style={styles.aiContentScroll} nestedScrollEnabled>
          <Text style={[styles.aiContent, darkMode && styles.textDark]}>{content}</Text>
        </ScrollView>

        {/* Copy & Share row */}
        <View style={styles.aiUtilRow}>
          <TouchableOpacity style={styles.aiUtilBtn} onPress={() => copyToClipboard(content)}>
            <Ionicons name="copy-outline" size={18} color={COLORS.accent} />
            <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>Copiar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiUtilBtn} onPress={() => shareAsPDF(content, tipo === 'resumo' ? (materiaResumo || cursoResumo || 'Resumo') : 'Meme')}>
            <Ionicons name="share-outline" size={18} color={COLORS.accent} />
            <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* AI Image section - separate from text */}
        {aiImageLoading && (
          <View style={styles.aiImageLoading}>
            <ActivityIndicator size="large" color={COLORS.success} />
            <Text style={[styles.aiLoadingText, darkMode && styles.textMuted]}>Gerando imagem...</Text>
          </View>
        )}
        {aiImageBase64 ? (
          <View style={styles.aiImageContainer}>
            <TouchableOpacity onPress={() => setPreviewImageModal(aiImageBase64)} activeOpacity={0.8}>
              <Image source={{ uri: aiImageBase64 }} style={styles.aiImage} resizeMode="contain" />
              <View style={styles.tapHint}>
                <Ionicons name="expand-outline" size={14} color={COLORS.white} />
                <Text style={styles.tapHintText}>Toque para ampliar</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.aiUtilRow}>
              <TouchableOpacity style={styles.aiUtilBtn} onPress={() => setPreviewImageModal(aiImageBase64)}>
                <Ionicons name="expand-outline" size={18} color={COLORS.accent} />
                <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>Ampliar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiUtilBtn, imageSelected && { borderColor: COLORS.success, backgroundColor: COLORS.success + '15' }]}
                onPress={() => {
                  if (!imageSelected) {
                    setFiles(prev => [...prev, aiImageBase64]);
                    setImageSelected(true);
                    setToast({ visible: true, message: 'Imagem adicionada ao post!', type: 'success' });
                  } else {
                    setFiles(prev => prev.filter(f => f !== aiImageBase64));
                    setImageSelected(false);
                    setToast({ visible: true, message: 'Imagem removida do post.', type: 'success' });
                  }
                }}
              >
                <Ionicons name={imageSelected ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={imageSelected ? COLORS.success : COLORS.accent} />
                <Text style={[styles.aiUtilText, { color: imageSelected ? COLORS.success : COLORS.accent }]}>{imageSelected ? 'Selecionada' : 'Selecionar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiUtilBtn} onPress={() => {
                Share.share({ message: 'Imagem gerada por IA - CampusFlow', url: aiImageBase64 }).catch(() => {});
              }}>
                <Ionicons name="share-outline" size={18} color={COLORS.accent} />
                <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>PNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Like/Dislike/Regenerate */}
        <View style={styles.aiActions}>
          <TouchableOpacity
            style={[styles.aiActionBtn, { backgroundColor: COLORS.success + '20' }]}
            onPress={() => setToast({ visible: true, message: 'Conteudo aprovado!', type: 'success' })}
          >
            <Ionicons name="thumbs-up" size={20} color={COLORS.success} />
            <Text style={[styles.aiActionText, { color: COLORS.success }]}>Curtir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aiActionBtn, { backgroundColor: COLORS.error + '20' }]}
            onPress={() => { onClear(); setAiImageBase64(''); }}
          >
            <Ionicons name="thumbs-down" size={20} color={COLORS.error} />
            <Text style={[styles.aiActionText, { color: COLORS.error }]}>Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aiActionBtn, { backgroundColor: COLORS.accent + '20' }]}
            onPress={() => generateAI(tipo)}
          >
            <Ionicons name="refresh" size={20} color={COLORS.accent} />
            <Text style={[styles.aiActionText, { color: COLORS.accent }]}>Gerar Novo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryFields = () => {
    switch (category) {
      case 'avisos':
        return (
          <>
            {renderInput('Assunto', assunto, setAssunto, 'Assunto do aviso')}
            {renderInput('Texto do Aviso', avisosText, setAvisosText, 'Descreva o aviso...', true)}
            {renderFileSection(false, true)}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, darkMode && styles.textDark]}>Urgencia</Text>
              <View style={styles.chipRow}>
                {['baixa', 'media', 'alta'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, urgencia === u && styles.chipActive,
                      u === 'alta' && urgencia === u && { backgroundColor: COLORS.error }]}
                    onPress={() => setUrgencia(u)}
                  >
                    <Text style={[styles.chipText, urgencia === u && styles.chipTextActive]}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        );

      case 'momentos':
        return (
          <>
            {renderFileSection(true)}
            {renderInput('Legenda', legenda, setLegenda, 'Escreva uma legenda... Use @ para marcar amigos', true)}
            {renderInput('Localizacao', localizacao, setLocalizacao, 'Onde voce esta?', false, 'location-outline')}
          </>
        );

      case 'estagios':
        return (
          <>
            {renderInput('Titulo da Vaga', tituloVaga, setTituloVaga, 'Ex: Estagio em Desenvolvimento')}
            {renderInput('Empresa', empresa, setEmpresa, 'Nome da empresa')}
            {renderInput('Descricao', descricaoVaga, setDescricaoVaga, 'Descreva a vaga...', true)}
            {renderInput('Requisitos', requisitos, setRequisitos, 'Requisitos da vaga...', true)}
            {renderInput('Beneficios', beneficios, setBeneficios, 'Beneficios oferecidos')}
            {renderInput('Salario', salario, setSalario, 'Ex: R$ 1.500,00', false, 'cash-outline')}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, darkMode && styles.textDark]}>Tipo de Contrato</Text>
              <View style={styles.chipRow}>
                {['CLT', 'Estagio', 'PJ', 'Temporario'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, tipoContrato === t && styles.chipActive]}
                    onPress={() => setTipoContrato(t)}
                  >
                    <Text style={[styles.chipText, tipoContrato === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.sectionDivider, darkMode && styles.sectionDividerDark]}>
              <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Verificacao da Empresa</Text>
            </View>
            {renderInput('LinkedIn da Empresa', linkedinEmpresa, setLinkedinEmpresa, 'https://linkedin.com/company/...', false, 'logo-linkedin')}
            {renderInput('Instagram da Empresa', instagramEmpresa, setInstagramEmpresa, '@empresa', false, 'logo-instagram')}
            {renderInput('Site da Empresa', siteEmpresa, setSiteEmpresa, 'https://empresa.com.br', false, 'globe-outline')}

            <View style={styles.anonNote}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
              <Text style={[styles.anonNoteText, darkMode && styles.textMuted]}>Publicacao anonima por padrao</Text>
            </View>
          </>
        );

      case 'paquera':
        return (
          <>
            {renderFileSection(true)}
            {renderInput('Legenda', paqueraLegenda, setPaqueraLegenda, 'Diga algo...')}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, darkMode && styles.textDark]}>Nivel de Beleza: {nivelBeleza}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.ratingCircle, n <= nivelBeleza && styles.ratingCircleActive]}
                    onPress={() => setNivelBeleza(n)}
                  >
                    <Text style={[styles.ratingNum, n <= nivelBeleza && styles.ratingNumActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.anonNote}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
              <Text style={[styles.anonNoteText, darkMode && styles.textMuted]}>Sempre anonimo</Text>
            </View>
          </>
        );

      case 'resumos':
        return (
          <>
            {renderInput('Curso', cursoResumo, setCursoResumo, 'Ex: Ciencia da Computacao')}
            {renderInput('Materia', materiaResumo, setMateriaResumo, 'Ex: Calculo II')}
            {renderFileSection(false, true)}
            {renderInput('Como voce precisa desse resumo?', descricaoResumo, setDescricaoResumo, 'Descreva o que precisa...', true)}

            <View style={[styles.switchRow, darkMode && { backgroundColor: COLORS.cardDark }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, darkMode && styles.textDark, { marginBottom: 0 }]}>Modo IA - Gerar Resumo</Text>
                <Text style={[styles.switchDesc, darkMode && styles.textMuted]}>A IA gera um resumo completo da materia</Text>
              </View>
              <Switch
                value={modoIAResumo}
                onValueChange={setModoIAResumo}
                trackColor={{ false: COLORS.lightGray, true: COLORS.accent + '50' }}
                thumbColor={modoIAResumo ? COLORS.accent : COLORS.darkGray}
              />
            </View>

            {modoIAResumo && !aiResumoContent && (
              <TouchableOpacity
                style={[styles.generateBtn, aiLoading && styles.generateBtnDisabled]}
                onPress={() => generateAI('resumo')}
                disabled={aiLoading || (!materiaResumo.trim() && !cursoResumo.trim())}
              >
                {aiLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={COLORS.white} />
                    <Text style={styles.generateBtnText}>Gerar Resumo com IA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {modoIAResumo && renderAIPreview(aiResumoContent, 'resumo', () => setAiResumoContent(''))}

            <View style={[styles.switchRow, darkMode && { backgroundColor: COLORS.cardDark }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, darkMode && styles.textDark, { marginBottom: 0 }]}>Gerar imagem com IA</Text>
                <Text style={[styles.switchDesc, darkMode && styles.textMuted]}>A IA gera uma descricao visual da materia</Text>
              </View>
              <Switch
                value={gerarImagemIA}
                onValueChange={setGerarImagemIA}
                trackColor={{ false: COLORS.lightGray, true: COLORS.accent + '50' }}
                thumbColor={gerarImagemIA ? COLORS.accent : COLORS.darkGray}
              />
            </View>

            {gerarImagemIA && (
              <TouchableOpacity
                style={[styles.generateBtn, aiLoading && styles.generateBtnDisabled, { backgroundColor: '#4CAF50' }]}
                onPress={generateImageDesc}
                disabled={aiLoading || (!materiaResumo.trim() && !cursoResumo.trim())}
              >
                {aiLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="image" size={20} color={COLORS.white} />
                    <Text style={styles.generateBtnText}>Gerar Imagem com IA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        );

      case 'memes':
        return (
          <>
            <View style={[styles.switchRow, darkMode && { backgroundColor: COLORS.cardDark }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, darkMode && styles.textDark, { marginBottom: 0 }]}>Modo IA Meme</Text>
                <Text style={[styles.switchDesc, darkMode && styles.textMuted]}>IA gera o meme baseado no seu prompt</Text>
              </View>
              <Switch
                value={modoIAMeme}
                onValueChange={(val) => {
                  setModoIAMeme(val);
                  if (!val) setAiMemeContent('');
                }}
                trackColor={{ false: COLORS.lightGray, true: COLORS.accent + '50' }}
                thumbColor={modoIAMeme ? COLORS.accent : COLORS.darkGray}
              />
            </View>

            {renderFileSection(false, false)}

            {modoIAMeme && (
              <>
                {renderInput('Prompt do Meme', promptMeme, setPromptMeme, 'Descreva o meme engracado que a IA deve gerar...', true)}
                {!aiMemeContent && (
                  <TouchableOpacity
                    style={[styles.generateBtn, aiLoading && styles.generateBtnDisabled]}
                    onPress={() => generateAI('meme')}
                    disabled={aiLoading || !promptMeme.trim()}
                  >
                    {aiLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={20} color={COLORS.white} />
                        <Text style={styles.generateBtnText}>Gerar Texto do Meme</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {renderAIPreview(aiMemeContent, 'meme', () => setAiMemeContent(''))}

                <TouchableOpacity
                  style={[styles.generateBtn, aiImageLoading && styles.generateBtnDisabled, { backgroundColor: '#4CAF50', marginTop: 8 }]}
                  onPress={generateMemeImage}
                  disabled={aiImageLoading || !promptMeme.trim()}
                >
                  {aiImageLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="image" size={20} color={COLORS.white} />
                      <Text style={styles.generateBtnText}>Gerar Imagem do Meme</Text>
                    </>
                  )}
                </TouchableOpacity>

                {aiImageBase64 && !aiImageLoading ? (
                  <View style={[styles.aiPreview, darkMode && styles.aiPreviewDark, { marginTop: 12 }]}>
                    <Text style={[styles.aiPreviewTitle, darkMode && styles.textDark]}>Meme Gerado</Text>
                    <TouchableOpacity onPress={() => setPreviewImageModal(aiImageBase64)} activeOpacity={0.8}>
                      <Image source={{ uri: aiImageBase64 }} style={styles.aiImage} resizeMode="contain" />
                      <View style={styles.tapHint}>
                        <Ionicons name="expand-outline" size={14} color={COLORS.white} />
                        <Text style={styles.tapHintText}>Toque para ampliar</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.aiUtilRow}>
                      <TouchableOpacity style={styles.aiUtilBtn} onPress={() => setPreviewImageModal(aiImageBase64)}>
                        <Ionicons name="expand-outline" size={18} color={COLORS.accent} />
                        <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>Ampliar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.aiUtilBtn} onPress={() => Share.share({ message: 'Meme - CampusFlow', url: aiImageBase64 }).catch(() => {})}>
                        <Ionicons name="share-outline" size={18} color={COLORS.accent} />
                        <Text style={[styles.aiUtilText, { color: COLORS.accent }]}>PNG</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.aiActions}>
                      <TouchableOpacity style={[styles.aiActionBtn, { backgroundColor: COLORS.success + '20' }]} onPress={() => setToast({ visible: true, message: 'Meme aprovado!', type: 'success' })}>
                        <Ionicons name="thumbs-up" size={20} color={COLORS.success} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.aiActionBtn, { backgroundColor: COLORS.error + '20' }]} onPress={() => setAiImageBase64('')}>
                        <Ionicons name="thumbs-down" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.aiActionBtn, { backgroundColor: COLORS.accent + '20' }]} onPress={generateMemeImage}>
                        <Ionicons name="refresh" size={20} color={COLORS.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </>
            )}
            {renderInput('Legenda', memeLegenda, setMemeLegenda, 'Legenda do meme...')}
          </>
        );

      default:
        return null;
    }
  };

  // Category selection screen
  if (!category) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <View style={{ width: 24 }} />
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Criar Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.categoryGrid}>
          <Text style={[styles.selectLabel, darkMode && styles.textMuted]}>Selecione o tipo de publicacao</Text>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, darkMode && styles.categoryCardDark]}
              onPress={() => setCategory(cat.id as CategoryType)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryIconWrap}>
                <Ionicons name={cat.icon as any} size={28} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.categoryCardTitle, darkMode && styles.textDark]}>{cat.label}</Text>
                <Text style={[styles.categoryCardDesc, darkMode && styles.textMuted]}>
                  {cat.id === 'avisos' && 'Avisos importantes para a turma'}
                  {cat.id === 'momentos' && 'Compartilhe momentos do campus'}
                  {cat.id === 'estagios' && 'Vagas de estagio e oportunidades'}
                  {cat.id === 'paquera' && 'Paquera anonima no campus'}
                  {cat.id === 'resumos' && 'Resumos e materiais de estudo'}
                  {cat.id === 'memes' && 'Memes e humor universitario'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.darkGray} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      </SafeAreaView>
    );
  }

  // Category form screen
  const activeCat = CATEGORIES.find(c => c.id === category);
  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => { resetAll(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name={(activeCat?.icon || 'create') as any} size={18} color={COLORS.accent} />
            <Text style={[styles.headerTitle, darkMode && styles.textDark, { marginLeft: 6 }]}>{activeCat?.label}</Text>
          </View>
          <TouchableOpacity
            style={[styles.postBtn, (!canSubmit() || isLoading) && styles.postBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit() || isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.postBtnText}>Postar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderCategoryFields()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Preview de Imagem */}
      <Modal visible={!!previewImageModal} transparent animationType="fade" onRequestClose={() => setPreviewImageModal(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImageModal(null)}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          {previewImageModal && (
            <Image source={{ uri: previewImageModal }} style={styles.modalImage} resizeMode="contain" />
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
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4 },
  textDark: { color: COLORS.white },
  textMuted: { color: COLORS.darkGray },
  postBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  content: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 120 },
  selectLabel: {
    fontSize: 15, color: COLORS.darkGray, marginBottom: 16, textAlign: 'center',
  },
  categoryGrid: { padding: SIZES.padding },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: SIZES.borderRadius,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  categoryCardDark: { backgroundColor: COLORS.cardDark },
  categoryIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.accent + '15', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  categoryCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  categoryCardDesc: { fontSize: 12, color: COLORS.darkGray },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.primary,
  },
  textArea: {
    flex: 1, backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.primary,
    minHeight: 120,
  },
  inputDark: { backgroundColor: COLORS.cardDark, color: COLORS.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.lightGray, marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: COLORS.accent },
  chipText: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  fileButtons: { flexDirection: 'row' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    padding: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.accent,
  },
  uploadBtnDark: { backgroundColor: COLORS.cardDark },
  uploadBtnText: { color: COLORS.accent, fontWeight: '600', marginLeft: 6, fontSize: 13 },
  filesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  fileThumb: { width: 72, height: 72, marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
  fileImg: { width: '100%', height: '100%' },
  removeFile: { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.white, borderRadius: 10 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius, padding: 16, marginBottom: 20,
  },
  switchDesc: { fontSize: 12, color: COLORS.darkGray, marginTop: 2 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
  },
  ratingCircleActive: { backgroundColor: COLORS.accent },
  ratingNum: { fontSize: 12, fontWeight: '700', color: COLORS.gray },
  ratingNumActive: { color: COLORS.white },
  anonNote: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.accent + '10', borderRadius: SIZES.borderRadius,
    padding: 12, marginBottom: 20,
  },
  anonNoteText: { fontSize: 13, color: COLORS.gray, marginLeft: 8 },
  sectionDivider: {
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
    marginTop: 8, marginBottom: 20, paddingTop: 16,
  },
  sectionDividerDark: { borderTopColor: COLORS.gray },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 16 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: SIZES.borderRadius,
    paddingVertical: 14, marginBottom: 20,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16, marginLeft: 8 },
  aiPreview: {
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.accent + '30',
  },
  aiPreviewDark: { backgroundColor: COLORS.cardDark },
  aiPreviewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  aiContentScroll: { maxHeight: 250 },
  aiContent: { fontSize: 14, lineHeight: 22, color: COLORS.primary },
  aiLoadingText: { marginTop: 12, fontSize: 14, color: COLORS.darkGray, textAlign: 'center' },
  aiActions: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 12,
  },
  aiActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, flex: 1, marginHorizontal: 4,
  },
  aiActionText: { fontWeight: '600', fontSize: 12, marginLeft: 4 },
  aiUtilRow: {
    flexDirection: 'row', marginTop: 12, marginBottom: 4,
  },
  aiUtilBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.accent, marginRight: 10,
  },
  aiUtilText: { fontWeight: '600', fontSize: 13, marginLeft: 6 },
  aiImageContainer: {
    marginTop: 12, borderRadius: SIZES.borderRadius, overflow: 'hidden',
  },
  aiImage: { width: '100%', height: 250, borderRadius: SIZES.borderRadius },
  aiImageLoading: {
    marginTop: 12, padding: 20, alignItems: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: SIZES.borderRadius,
  },
  tapHint: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tapHintText: { fontSize: 11, color: '#FFFFFF', marginLeft: 4 },
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
