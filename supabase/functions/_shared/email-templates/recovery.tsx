/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinição de senha — ProvaX</Preview>
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
        <Heading style={h1}>Redefinir senha</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir a senha da sua conta no ProvaX.
          Clique no botão abaixo para escolher uma nova senha.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Redefinir Senha
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
