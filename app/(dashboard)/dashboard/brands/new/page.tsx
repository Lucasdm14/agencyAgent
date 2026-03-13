import { BrandForm } from '@/components/brands/brand-form'

export default function NewBrandPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Nueva Marca</h2>
        <p className="text-muted-foreground">Configura la informacion de la marca para entrenar a los agentes AI</p>
      </div>
      
      <BrandForm />
    </div>
  )
}
