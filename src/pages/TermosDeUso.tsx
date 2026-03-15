import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
          </Button>
          <span className="font-display text-xl font-bold text-primary">ProvaX</span>
        </div>
      </nav>

      <main className="container max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Termos de Uso e Política de Privacidade</CardTitle>
            <p className="text-sm text-muted-foreground">Última atualização: 28 de fevereiro de 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">

            <section>
              <h3 className="font-display text-lg font-semibold">1. Sobre a Plataforma</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX é uma plataforma de simulados e geração de provas personalizadas voltada à preparação para
                concursos públicos, ENEM e provas universitárias. Nosso objetivo é oferecer ferramentas inteligentes de estudo que auxiliem
                o candidato na sua jornada de preparação e aprovação.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">2. Responsabilidade do Usuário</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">O usuário é responsável:</p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                <li>Pela veracidade das informações fornecidas durante o cadastro.</li>
                <li>Pela guarda e sigilo de suas credenciais de acesso (a senha deve conter no mínimo 6 caracteres, incluindo pelo menos 1 letra e 1 número).</li>
                <li>Pelo uso adequado e ético da plataforma, respeitando outros usuários e os termos aqui descritos.</li>
                <li>Por não utilizar ferramentas automatizadas para acessar a plataforma de forma indevida.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">3. Planos e Limites de Uso</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX oferece três planos de acesso: <strong>Gratuito</strong>, <strong>Start</strong> e <strong>Pro</strong>.
                Cada plano possui um limite diário de questões que pode ser gerado, renovado automaticamente a cada dia (00h00 UTC-3).
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Gratuito:</strong> 10 questões por dia, acesso às funcionalidades básicas.</li>
                <li><strong>Start (R$ 29,90/mês):</strong> 25 questões por dia, todas as disciplinas liberadas, estatísticas básicas e histórico de erros.</li>
                <li><strong>Pro (R$ 49,90/mês):</strong> 60 questões por dia, filtros avançados por banca/estado/concurso, ranking, estatísticas avançadas e simulado reverso inteligente.</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                <strong>Política de uso justo:</strong> Os limites diários são individuais e intransferíveis. Questões não utilizadas em um dia não acumulam para o dia seguinte.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">4. Períodos de Assinatura</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Os planos pagos (Start e Pro) podem ser contratados nos seguintes períodos:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Mensal:</strong> Vigência de 30 dias a partir da contratação.</li>
                <li><strong>Trimestral:</strong> Vigência de 90 dias (3 meses) a partir da contratação.</li>
                <li><strong>Anual:</strong> Vigência de 365 dias (12 meses) a partir da contratação.</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                <strong>Renovação:</strong> A renovação da assinatura <strong>não é automática</strong>. Ao término do período contratado, o usuário retorna ao plano Gratuito até que realize uma nova contratação. A ProvaX poderá notificar o usuário próximo ao vencimento para facilitar a renovação.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">5. Propriedade Intelectual</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Todo o conteúdo da plataforma, incluindo questões geradas por inteligência artificial, design,
                textos, marcas e logotipos, é de propriedade exclusiva da ProvaX ou licenciado para uso na plataforma.
                É proibida a reprodução, distribuição ou comercialização indevida de qualquer conteúdo sem autorização
                prévia e expressa.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">6. Cancelamento e Reembolso</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O usuário pode solicitar o cancelamento de sua assinatura a qualquer momento. Oferecemos garantia
                de reembolso integral em até 7 dias corridos após a contratação do plano pago, desde que solicitado
                por meio dos canais oficiais de atendimento. Após os 7 dias, o acesso permanecerá ativo até o fim do período contratado, sem reembolso proporcional.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">7. Limitação de Responsabilidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX é uma ferramenta de apoio ao estudo e não garante aprovação em concursos públicos, ENEM ou provas universitárias.
                Os resultados dependem do empenho, dedicação e estratégia individual de cada candidato. A plataforma
                não se responsabiliza por eventuais divergências entre o conteúdo dos simulados e o conteúdo de
                provas oficiais.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">8. Proteção de Dados</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX trata os dados pessoais dos usuários de acordo com a Lei Geral de Proteção de Dados (LGPD).
                Os dados coletados são utilizados exclusivamente para operação da plataforma, personalização da
                experiência de estudo e comunicação com o usuário. Não compartilhamos dados pessoais com terceiros
                para fins comerciais sem consentimento expresso.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">9. Programa de Indicação</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX oferece um Programa de Indicação que recompensa usuários com XP (pontos de experiência) e moedas
                ao convidarem novos usuários para a plataforma. O programa funciona da seguinte forma:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Cadastro confirmado:</strong> O indicador recebe 20 XP e 20 moedas quando o indicado conclui o cadastro com conta válida.</li>
                <li><strong>Bônus Plano Free:</strong> Usuários no plano gratuito recebem +10 XP extras por indicação válida.</li>
                <li><strong>Assinatura paga:</strong> O indicador recebe 30 XP adicionais quando o indicado assina um plano pago (bônus Free de +10 XP também se aplica).</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                <strong>Regras antifraude:</strong> São vedados o autocadastro, a criação de múltiplas contas, o uso de e-mails
                temporários e qualquer artifício para obter recompensas indevidas. A plataforma monitora IPs, dispositivos e
                padrões de comportamento. Em caso de irregularidade, a ProvaX poderá remover XP concedido, bloquear contas e
                suspender a participação no programa.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">10. Disposições Gerais</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX reserva-se o direito de atualizar estes Termos de Uso a qualquer momento, notificando os
                usuários sobre alterações relevantes. O uso continuado da plataforma após a publicação de alterações
                constitui aceitação dos novos termos. Em caso de dúvidas, entre em contato através dos canais oficiais
                de atendimento.
              </p>
            </section>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
