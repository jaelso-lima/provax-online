/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu email para começar a usar o ProvaX</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>
            <span style={{ color: '#4935d1' }}>P</span>
            <span style={{ color: '#1cb88a' }}>X</span>
            {' '}ProvaX
          </Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Confirme seu email</Heading>
        <Text style={text}>
          Bem-vindo ao{' '}
          <Link href={siteUrl} style={link}>
            <strong>ProvaX</strong>
          </Link>
          ! Estamos felizes em ter você conosco.
        </Text>
        <Text style={text}>
          Para ativar sua conta ({recipient}), clique no botão abaixo:
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Confirmar Email
          </Button>
        </Section>
        <Text style={hint}>
          Você receberá 30 moedas grátis ao confirmar sua conta.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Se você não criou uma conta no ProvaX, ignore este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '10px' }
const logo = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  color: '#121e38',
  margin: '0',
}
const divider = { borderColor: '#e5e7eb', margin: '20px 0' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  color: '#121e38',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const hint = {
  fontSize: '13px',
  color: '#1cb88a',
  lineHeight: '1.5',
  margin: '0 0 16px',
  fontWeight: '500' as const,
}
const link = { color: '#4935d1', textDecoration: 'underline' }
const button = {
  backgroundColor: '#4935d1',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
