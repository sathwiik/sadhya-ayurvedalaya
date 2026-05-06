interface Props {
  consentText: string
  onAgree: () => void
  onDecline: () => void
}

export default function ConsentModal({ consentText, onAgree, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="mb-2">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
            Saadhya Ayurvedalaya
          </p>
          <h2 className="text-lg font-bold text-gray-900">Privacy Notice</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-6">{consentText}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onAgree}
            className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold text-sm hover:bg-green-800"
          >
            Yes, show my appointment
          </button>
          <button
            onClick={onDecline}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold text-sm hover:bg-gray-200"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
