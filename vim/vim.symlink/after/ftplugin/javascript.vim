" Two spaces for tabs everywhere
setlocal expandtab shiftwidth=2 tabstop=2

" Sets background for 81st column onward
if exists('+colorcolumn')
  let &colorcolumn=join(range(81,999),",")
endif
