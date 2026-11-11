import { useState } from 'react'
import { Plus, ArrowRightLeft, History, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, Info } from 'lucide-react'
import Botao from '@/components/ui/Botao'
import Campo from '@/components/ui/Campo'
import Etiqueta from '@/components/ui/Etiqueta'
import Nivel from '@/components/ui/Nivel'
import Cartao from '@/components/ui/Cartao'
import TituloSecao from '@/components/ui/TituloSecao'
import Tabela, { TabelaWrap, Pessoa } from '@/components/ui/Tabela'
import Arco from '@/components/ui/Arco'
import Jornada from '@/components/ui/Jornada'
import Resumo from '@/components/ui/Resumo'
import Cabecalho from '@/components/ui/Cabecalho'
import Vazio from '@/components/ui/Vazio'

/**
 * Página interna de desenvolvimento (OS-016) — mostra todos os
 * componentes da biblioteca `src/components/ui/` para conferência visual
 * contra os `preview.html` de `docs/design-system/components/`.
 *
 * Fora do menu de propósito (não entra em Sidebar.tsx). Para ver nos dois
 * temas, use o seletor de tema da topbar — a página em si não duplica o
 * layout nos dois temas ao mesmo tempo, porque o app inteiro vira com um
 * único data-theme no <html> (ver src/lib/useTheme.ts); não há como um
 * tema "escuro" local coexistir com o tema real da página sem reimplementar
 * o mecanismo de tokens.
 */
export default function DesignPage() {
  const [email, setEmail] = useState('juliana.nishimura@')
  const [carregando, setCarregando] = useState(false)

  return (
    <div className="br" style={{ display: 'grid', gap: 40, paddingBottom: 40 }}>
      <Cabecalho
        titulo="Design — biblioteca de componentes"
        descricao="Página interna (OS-016), fora do menu. Confira contra os preview.html de docs/design-system/components/."
      />

      <section>
        <TituloSecao titulo="Botão" kanji="部品" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Botao variante="primario"><Plus aria-hidden="true" />Nova matrícula</Botao>
          <Botao variante="secundario"><ArrowRightLeft aria-hidden="true" />Trocar de turma</Botao>
          <Botao variante="fantasma"><History aria-hidden="true" />Ver histórico</Botao>
          <Botao variante="perigo">Cancelar matrícula</Botao>
          <Botao variante="secundario" icone aria-label="Mais ações"><MoreHorizontal aria-hidden="true" /></Botao>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Botao
            variante="primario"
            carregando={carregando}
            onClick={() => { setCarregando(true); setTimeout(() => setCarregando(false), 2000) }}
          >
            Salvando
          </Botao>
          <Botao variante="secundario" disabled>Indisponível</Botao>
        </div>
      </section>

      <section>
        <TituloSecao titulo="Campo" kanji="入力" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, maxWidth: 780 }}>
          <Campo id="ds-nome" rotulo="Nome do responsável" obrigatorio ajuda="Quem assina o contrato e recebe as cobranças.">
            <input defaultValue="Juliana Nishimura" />
          </Campo>
          <Campo id="ds-mensalidade" rotulo="Mensalidade" prefixo="¥" ajuda="Valor cheio, antes do desconto.">
            <input defaultValue="12.800" />
          </Campo>
          <Campo
            id="ds-email"
            rotulo="E-mail"
            erro="Falta o domínio depois do @, por exemplo gmail.com."
          >
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </Campo>
          <Campo id="ds-venc" rotulo="Dia de vencimento">
            <select><option>Dia 10</option><option>Dia 25</option></select>
          </Campo>
        </div>
      </section>

      <section>
        <TituloSecao titulo="Etiqueta" kanji="状態" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Etiqueta variante="ok" icone={CheckCircle2}>Pago dia 08</Etiqueta>
          <Etiqueta variante="atencao" icone={Clock}>Vence dia 10</Etiqueta>
          <Etiqueta variante="erro" icone={AlertTriangle}>Atrasada 12 dias</Etiqueta>
          <Etiqueta variante="info" icone={Info}>Avaliação qui 14h</Etiqueta>
          <Etiqueta variante="marca">Novo aluno</Etiqueta>
          <Etiqueta variante="neutra">Rascunho</Etiqueta>
        </div>
      </section>

      <section>
        <TituloSecao titulo="Nível JLPT" kanji="日本語" />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Nivel nivel="N5" /><Nivel nivel="N4" /><Nivel nivel="N3" />
          <Nivel nivel="N3" previsto />
          <span className="dado" style={{ color: 'var(--texto-sub)' }}>previsto pela avaliação · 14/20</span>
        </div>
      </section>

      <section>
        <TituloSecao titulo="Arco" kanji="進度" />
        <div style={{ display: 'flex', gap: 48, alignItems: 'end' }}>
          <Arco width={220} fracao={0.85} numero="85%" descricao="recebido de novembro" />
          <Arco fracao={0.6} numero="12 de 20" descricao="vagas na turma de sábado" />
          <Arco fracao={0.875} numero="7 de 8" descricao="aulas com presença" />
        </div>
      </section>

      <section>
        <TituloSecao titulo="Jornada" kanji="在籍" />
        <div style={{ maxWidth: 720 }}>
          <Jornada
            etapas={[
              { nome: 'Contato', quando: '02/02', estado: 'feito' },
              { nome: 'Avaliação', quando: 'N4 · 18/02', estado: 'feito' },
              { nome: 'Matrícula', quando: 'aguardando pagamento', estado: 'atual' },
              { nome: 'Em aula', quando: 'sáb 07/03' },
            ]}
          />
        </div>
      </section>

      <section>
        <TituloSecao titulo="Resumo" kanji="会計" />
        <Resumo
          itens={[
            { dt: 'Recebido em novembro', dd: '¥ 384.600', small: 'de ¥ 452.800 previstos · 85%', escuro: true },
            { dt: 'Em atraso', dd: '¥ 34.400', small: '3 cobranças', corDd: 'var(--erro)' },
            { dt: 'Alunos ativos', dd: '37', small: '+4 desde outubro', marca: true },
          ]}
        />
      </section>

      <section>
        <TituloSecao
          titulo="Mensalidades de novembro"
          kanji="会計"
          acao={<Botao variante="fantasma">Ver todas</Botao>}
        />
        <TabelaWrap>
          <Tabela>
            <thead>
              <tr><th>Aluno</th><th>Turma</th><th className="num">Valor</th><th>Situação</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><Pessoa nome="Kaori Nishimura Albuquerque" sub="resp. Juliana" iniciais="KN" /></td>
                <td>JLPT N4 · sáb 9h30</td>
                <td className="num">¥ 12.800</td>
                <td><Etiqueta variante="ok" icone={CheckCircle2}>Pago dia 08</Etiqueta></td>
              </tr>
              <tr>
                <td><Pessoa nome="Rafael Tanaka Moreira" iniciais="RT" /></td>
                <td>JLPT N5 · qua 19h</td>
                <td className="num">¥ 11.200</td>
                <td><Etiqueta variante="erro" icone={AlertTriangle}>Atrasada 12 dias</Etiqueta></td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>2 cobranças</td><td className="num">¥ 24.000</td><td /></tr>
            </tfoot>
          </Tabela>
        </TabelaWrap>
      </section>

      <section>
        <TituloSecao titulo="Estado vazio" kanji="空" />
        <Vazio
          titulo="Nenhuma aula registrada nesta semana"
          descricao="Quando o professor fizer a chamada pelo portal, a aula aparece aqui com a presença de cada aluno."
          acao={<Botao variante="secundario">Registrar aula manualmente</Botao>}
        />
      </section>

      <section>
        <TituloSecao titulo="Cartão" kanji="枠" />
        <div style={{ display: 'flex', gap: 16 }}>
          <Cartao style={{ padding: 20, flex: 1 }}>Cartão claro padrão.</Cartao>
          <Cartao escuro style={{ padding: 20, flex: 1 }}>Cartão grafite (escuro), usado no Resumo.</Cartao>
        </div>
      </section>
    </div>
  )
}
