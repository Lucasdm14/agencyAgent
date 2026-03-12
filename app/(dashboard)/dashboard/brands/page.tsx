import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Building2, Edit, Bot } from 'lucide-react'
import { DeleteBrandButton } from '@/components/brands/delete-brand-button'

export default async function BrandsPage() {
  const supabase = await createClient()
  
  const { data: brands } = await supabase
    .from('brands')
    .select('*, agents(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marcas</h2>
          <p className="text-muted-foreground">Gestiona las marcas de tus clientes</p>
        </div>
        <Link href="/dashboard/brands/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Marca
          </Button>
        </Link>
      </div>

      {brands && brands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} className="bg-card border-border hover:border-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                      {brand.logo_url ? (
                        <img 
                          src={brand.logo_url} 
                          alt={brand.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-accent" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-card-foreground text-lg">{brand.name}</CardTitle>
                      {brand.industry && (
                        <CardDescription className="text-muted-foreground text-sm">
                          {brand.industry}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {brand.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {brand.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    <span>{brand.agents?.[0]?.count || 0} agentes</span>
                  </div>
                  {brand.tone_of_voice && (
                    <span className="px-2 py-1 rounded-full bg-accent/20 text-xs text-accent">
                      {brand.tone_of_voice}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/brands/${brand.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay marcas</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Comienza agregando tu primera marca para crear agentes AI personalizados
            </p>
            <Link href="/dashboard/brands/new">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Crear primera marca
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
