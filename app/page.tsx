import { Dependencies } from "@/components/dependencies"
import { StatusOverview } from "@/components/status-overview"

export default function StatusPage() {
  return (
    <div className="m-4 md:mx-16 md:my-8">
      <StatusOverview />
      <Dependencies />
    </div>
  )
}
