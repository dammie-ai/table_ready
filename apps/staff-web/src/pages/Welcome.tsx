import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()
  const isWithinGeofence = localStorage.getItem('tableready_within_geofence') !== 'false'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-white mb-4">TableReady</h1>
        <p className="text-xl text-blue-100 mb-12">Order from your table or on the go</p>

        <div className="grid gap-4 max-w-md mx-auto">
          <button
            onClick={() => navigate('/combos')}
            className="bg-orange-500 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-orange-600 shadow-lg"
          >
            Combo Deals
          </button>
          
          {isWithinGeofence && (
            <button
              onClick={() => navigate('/menu?mode=dine-in')}
              className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
            >
              Dine In
            </button>
          )}
          
          <button
            onClick={() => navigate('/menu?mode=pickup')}
            className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
          >
            Pickup
          </button>
          <button
            onClick={() => navigate('/menu?mode=delivery')}
            className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
          >
            Delivery
          </button>
        </div>

        <p className="text-blue-200 mt-8">
          Staff? <button onClick={() => navigate('/login')} className="underline">Sign in</button>
        </p>
      </div>
    </div>
  )
}
