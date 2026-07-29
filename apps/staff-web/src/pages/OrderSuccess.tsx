import { Link } from 'react-router-dom'

export default function OrderSuccess() {
  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <div className="py-20">
        <h1 className="text-4xl font-bold text-green-600 mb-4">Order Placed!</h1>
        <p className="text-gray-600 mb-8">Your order has been confirmed and sent to the kitchen.</p>
        <Link
          to="/menu"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Order More
        </Link>
      </div>
    </div>
  )
}
