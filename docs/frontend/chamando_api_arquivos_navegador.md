---
sidebar_position: 3
title: "Chamando API de Arquivos do Navegador"
---

Em 14/01/2025 eu usei a abordagem abaixo para conseguir exibir a API de arquivos do navegador, já que não encontrei nenhuma forma nativa do Angular.
A API de arquivos do navegador é utilisada para abrir, salvar e carregar arquivos contidos no computador em que a aplicação está rodando.

## Criei na raiz da pasta src o arquivo global.d.ts com o conteúdo abaixo:

```
interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
      excludeAcceptAllOption?: boolean;
    }) => Promise<FileSystemFileHandle>;
  }
  
  
  interface FileSystemFileHandle {
    createWritable: (options?: FileSystemCreateWritableOptions) => Promise<FileSystemWritableFileStream>;
  }
  
  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean; // Indica se os dados existentes no arquivo devem ser preservados
  }
  
  interface FileSystemWritableFileStream {
    write: (data: FileSystemWriteChunkType) => Promise<void>;
    close: () => Promise<void>;
  }
  ```

## Atualize seu tsconfig.json para usar a biblioteca padrão mais recente:
 ```
{
  "compilerOptions": {
    "lib": ["dom"]
  }
}
 ```
:::info
CERTIFIQUE SE DE REINICIAR O SERVIDOR LOCAL PARA TESTAR.
:::

## Exemplo de uso

```
  async backupData(loggedInUser: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getReportsToBackup(loggedInUser.uid).pipe(take(1)).subscribe({
        next: async (reports: any) => {
          try {
            if (reports.length > 0) {
              console.log(reports);
  
              const data = `{"${loggedInUser.uid}":
                {"reports":${JSON.stringify(reports[0])}}}`;
  
              const blob = new Blob([data], { type: 'application/json' });
              const currentDate = new Date().toLocaleDateString();
              const fileName = `backup ${currentDate.replaceAll("/", "-")} - ${loggedInUser.displayName}.json`;
  
              if (window.showSaveFilePicker) {
                try {
                  const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [
                      {
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                      }
                    ]
                  });
  
                  const writable = await handle.createWritable();
                  await writable.write(blob);
                  await writable.close();
                } catch (error: any) {
                  if (error.name === 'AbortError') {
                    console.log('Ação de salvamento cancelada pelo usuário.');
                    return resolve();
                  } else {
                    throw error;
                  }
                }
              } else {
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = fileName;
                downloadLink.click();
                URL.revokeObjectURL(url);
              }
  
              document.getElementById('closeModalBackup')?.click();
              resolve();
            } else {
              throw new NoDataToBackupException("Não há relatos para serem exportados!!!");
            }
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error),
      });
    });
  }
```





