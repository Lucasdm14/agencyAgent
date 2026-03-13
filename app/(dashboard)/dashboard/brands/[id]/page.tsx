import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BrandForm } from '@/components/brands/brand-form'

interface EditBrandPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Editar Marca</h2>
        <p className="text-muted-foreground">Actualiza la informacion de {brand.name}</p>
      </div>
      
      <BrandForm brand={brand} />
    </div>
  )
}
