import eyespeakLogo from '../../assets/eyespeak_logo.svg'
import { logoImage, logoWrap, subtitle } from './authPageStyles'

interface AuthBrandProps {
  subtitleText: string
}

export default function AuthBrand({ subtitleText }: AuthBrandProps) {
  return (
    <div style={logoWrap}>
      <img src={eyespeakLogo} alt="eyespeak" style={logoImage} />
      <p style={subtitle}>{subtitleText}</p>
    </div>
  )
}
