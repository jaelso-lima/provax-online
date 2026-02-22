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
            <p className="text-sm text-muted-foreground">Última atualização: 22 de fevereiro de 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">

            <section>
              <h3 className="font-display text-lg font-semibold">1. Sobre a Plataforma</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX é uma plataforma de simulados e geração de provas personalizadas voltada à preparação para
                concursos públicos e ENEM. Nosso objetivo é oferecer ferramentas inteligentes de estudo que auxiliem
                o candidato na sua jornada de preparação.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">2. Responsabilidade do Usuário</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">O usuário é responsável:</p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                <li>Pela veracidade das informações fornecidas durante o cadastro.</li>
                <li>Pela guarda e sigilo de suas credenciais de acesso.</li>
                <li>Pelo uso adequado e ético da plataforma, respeitando outros usuários e os termos aqui descritos.</li>
                <li>Por não utilizar ferramentas automatizadas para acessar a plataforma de forma indevida.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">3. Plano Gratuito</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usuários do plano gratuito recebem créditos diários não cumulativos, renovados automaticamente a cada
                24 horas quando o saldo estiver zerado. O plano gratuito oferece acesso às funcionalidades básicas da
                plataforma, incluindo simulados de até 20 questões e relatório básico de desempenho.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">4. Plano Pago</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usuários assinantes possuem acesso ampliado conforme o plano contratado, incluindo créditos
                acumulativos, simulados com maior número de questões, correção de redações por inteligência artificial
                e relatórios avançados de desempenho. Os valores e benefícios de cada plano estão descritos na
                página de planos.
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
                por meio dos canais oficiais de atendimento.
              </p>
            </section>

            <section>
              <h3 className="font-display text-lg font-semibold">7. Limitação de Responsabilidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A ProvaX é uma ferramenta de apoio ao estudo e não garante aprovação em concursos públicos ou no ENEM.
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
              <h3 className="font-display text-lg font-semibold">9. Disposições Gerais</h3>
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
