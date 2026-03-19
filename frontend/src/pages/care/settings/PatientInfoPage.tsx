import CareSettingLayout from './CareSettingLayout'

export default function PatientInfoPage() {
  return (
    <CareSettingLayout title="환자 기본 정보">
      <p className="text-[13px] text-[#718096] mt-4">
        환자 기본 정보 수정 화면 (이름, 생년월일, 성별)
      </p>
    </CareSettingLayout>
  )
}
