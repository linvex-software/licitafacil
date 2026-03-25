#!/bin/bash
echo "Gerando extensão LVX..."
cd apps/extensao-chrome
zip -r ../../lvx-licitacao-extensao.zip . -x "*.DS_Store" -x "__MACOSX/*"
echo "Gerado: lvx-licitacao-extensao.zip"
