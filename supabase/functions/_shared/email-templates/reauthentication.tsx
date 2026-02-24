/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação — ProvaX</Preview>
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
        <Heading style={h1}>Código de verificação</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Este código expira em breve. Se você não solicitou, ignore este email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'Space Grotesk', Courier, monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#4935d1',
  letterSpacing: '6px',
  margin: '0',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
